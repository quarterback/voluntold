import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { mustManageTask } from '../auth';
import { loadFields, loadOrg, loadTask, logEvent, toTask } from '../db';
import { cleanText, fail, newId } from '../util';
import { batchSize, DAY, requirementText } from '../../shared/rules';
import type { AskMode, Field, Requirement, RequirementOp, Task, Timing } from '../../shared/types';
import { candidates, createAsks, holdingCount, renewLink, sweep } from '../engine';
import { syncTask } from '../atproto';
import { standing } from '../../shared/sentences';

export const taskRoutes = new Hono<AppBindings>();

const OPS_BY_TYPE: Record<Field['type'], RequirementOp[]> = {
  text: ['is', 'includes'],
  number: ['is', 'atLeast', 'atMost'],
  date: ['atLeast', 'atMost'],
  one: ['is', 'atLeast', 'atMost'],
  many: ['includes'],
  yesno: ['isYes'],
};

function toMs(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Date.parse(String(value));
  return Number.isFinite(n) ? n : null;
}

async function readTaskInput(db: D1Database, orgId: string, body: Record<string, unknown>, current?: Task) {
  const fields = await loadFields(db, orgId);
  const { results: teams } = await db.prepare('SELECT id FROM teams WHERE org_id = ?').bind(orgId).all<{ id: string }>();
  const teamIds = new Set(teams.map((t) => t.id));
  const pick = <K extends keyof Task>(key: K, value: unknown): unknown => (value === undefined && current ? current[key] : value);

  const title = cleanText(pick('title', body.title), 200);
  if (!title) fail(400, 'Give the task a title.');
  const timing = pick('timing', body.timing) as Timing;
  if (!['at_time', 'by_date', 'none'].includes(timing)) fail(400, 'Say when the task happens.');
  const startsAt = toMs(pick('startsAt', body.startsAt));
  const endsAt = toMs(pick('endsAt', body.endsAt));
  const dueAt = toMs(pick('dueAt', body.dueAt));
  if (timing === 'at_time' && (startsAt === null || endsAt === null || endsAt <= startsAt)) fail(400, 'End must be after start.');
  if (timing === 'by_date' && dueAt === null) fail(400, 'Set a due date.');
  const peopleNeeded = Number(pick('peopleNeeded', body.peopleNeeded));
  if (!Number.isInteger(peopleNeeded) || peopleNeeded < 1 || peopleNeeded > 500) fail(400, 'People must be 1 to 500.');
  const askMode = (pick('askMode', body.askMode) ?? 'few') as AskMode;
  if (!['few', 'everyone', 'hand'].includes(askMode)) fail(400, 'Choose how to ask people.');
  const rawBatch = pick('askBatch', body.askBatch);
  const askBatch = rawBatch === null || rawBatch === undefined || rawBatch === '' ? null : Number(rawBatch);
  if (askBatch !== null && (!Number.isInteger(askBatch) || askBatch < 1 || askBatch > 200)) fail(400, 'Group size must be 1 to 200.');
  const askWaitHours = Number(pick('askWaitHours', body.askWaitHours) ?? 24);
  if (!Number.isInteger(askWaitHours) || askWaitHours < 1 || askWaitHours > 336) fail(400, 'Hours between groups must be 1 to 336.');
  const teamId = (pick('teamId', body.teamId) as string | null) || null;
  if (teamId && !teamIds.has(teamId)) fail(400, "That team doesn't exist.");

  const rawReqs = pick('requirements', body.requirements);
  if (!Array.isArray(rawReqs) || rawReqs.length > 20) fail(400, 'A task can have up to 20 requirements.');
  const requirements: Requirement[] = rawReqs.map((r: Record<string, unknown>) => {
    if (r?.kind === 'team') {
      if (!teamIds.has(String(r.teamId))) fail(400, "A requirement uses a team that doesn't exist.");
      return { kind: 'team', teamId: String(r.teamId) };
    }
    const field = fields.find((f) => f.id === r?.fieldId);
    if (!field) fail(400, "A requirement uses a field that doesn't exist.");
    const op = r.op as RequirementOp;
    if (!OPS_BY_TYPE[field.type].includes(op)) fail(400, `That rule does not work for ${field.label}.`);
    if (op === 'isYes') return { kind: 'field', fieldId: field.id, op };
    const value = field.type === 'number' ? Number(r.value) : cleanText(r.value, 100);
    if (value === '' || (typeof value === 'number' && !Number.isFinite(value))) fail(400, `Give a value for ${field.label}.`);
    return { kind: 'field', fieldId: field.id, op, value };
  });

  return {
    title,
    description: cleanText(pick('description', body.description), 4000),
    contact: cleanText(pick('contact', body.contact), 300),
    timing,
    startsAt: timing === 'at_time' ? startsAt : null,
    endsAt: timing === 'at_time' ? endsAt : null,
    dueAt: timing === 'by_date' ? dueAt : null,
    placePublic: cleanText(pick('placePublic', body.placePublic), 200),
    placePrivate: cleanText(pick('placePrivate', body.placePrivate), 500),
    peopleNeeded,
    requirements,
    askMode,
    askBatch,
    askWaitHours,
    teamId,
    publish: Boolean(pick('publish', body.publish)),
  };
}

async function counts(db: D1Database, orgId: string) {
  const [spots, asks] = await Promise.all([
    db.prepare("SELECT task_id, COUNT(*) AS n FROM spots WHERE org_id = ? AND status IN ('holding', 'done') GROUP BY task_id").bind(orgId).all<{ task_id: string; n: number }>(),
    db.prepare("SELECT task_id, COUNT(*) AS n FROM asks WHERE org_id = ? AND status = 'waiting' GROUP BY task_id").bind(orgId).all<{ task_id: string; n: number }>(),
  ]);
  return { taken: new Map(spots.results.map((r) => [r.task_id, r.n])), waiting: new Map(asks.results.map((r) => [r.task_id, r.n])) };
}

taskRoutes.get('/tasks', async (c) => {
  const orgId = c.get('actor').orgId;
  await sweep(c.env, c.get('now'), orgId);
  const { results } = await c.env.DB.prepare('SELECT * FROM tasks WHERE org_id = ? ORDER BY COALESCE(starts_at, due_at, created_at)').bind(orgId).all();
  const { taken, waiting } = await counts(c.env.DB, orgId);
  return c.json({
    tasks: results.map((r) => {
      const t = toTask(r);
      return { ...t, taken: taken.get(t.id) ?? 0, waiting: waiting.get(t.id) ?? 0, atError: (r as { at_error: string | null }).at_error };
    }),
  });
});

taskRoutes.post('/tasks', async (c) => {
  const actor = c.get('actor');
  const body = await c.req.json().catch(() => ({}));
  const input = await readTaskInput(c.env.DB, actor.orgId, body);
  mustManageTask(actor, input.teamId);
  const id = newId();
  const now = c.get('now');
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO tasks (id, org_id, team_id, title, description, contact, timing, starts_at, ends_at, due_at, place_public, place_private,
        people_needed, requirements_json, ask_mode, ask_batch, ask_wait_hours, publish, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    ).bind(
      id, actor.orgId, input.teamId, input.title, input.description, input.contact, input.timing, input.startsAt, input.endsAt, input.dueAt,
      input.placePublic, input.placePrivate, input.peopleNeeded, JSON.stringify(input.requirements), input.askMode, input.askBatch,
      input.askWaitHours, input.publish ? 1 : 0, actor.memberId, now, now,
    ),
    logEvent(c.env.DB, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'created', objectType: 'task', objectId: id, at: now }),
  ]);
  if (body.open === true) await openTask(c.env, actor.orgId, id, now);
  return c.json({ id }, 201);
});

async function openTask(env: AppBindings['Bindings'], orgId: string, id: string, now: number) {
  const res = await env.DB.prepare("UPDATE tasks SET status = 'open', updated_at = ? WHERE id = ? AND org_id = ? AND status = 'draft'").bind(now, id, orgId).run();
  if (res.meta.changes === 0) fail(409, 'Only drafts can be published.');
  await syncTask(env, orgId, id);
}

async function taskFor(c: { env: AppBindings['Bindings']; get: (k: 'actor') => AppBindings['Variables']['actor'] }, id: string) {
  const actor = c.get('actor');
  const task = await loadTask(c.env.DB, actor.orgId, id);
  if (!task) fail(404, 'Not found');
  return task;
}

taskRoutes.get('/tasks/:taskId', async (c) => {
  const actor = c.get('actor');
  const now = c.get('now');
  await sweep(c.env, now, actor.orgId);
  const task = await taskFor(c, c.req.param('taskId'));
  const db = c.env.DB;
  const row = await db.prepare('SELECT at_uri, at_event_uri, at_error FROM tasks WHERE id = ?').bind(task.id).first<Record<string, string | null>>();
  const [spots, asks, fields, teams, all] = await Promise.all([
    db.prepare('SELECT s.id, s.status, s.volunteer_id, v.name FROM spots s JOIN volunteers v ON v.id = s.volunteer_id WHERE s.org_id = ? AND s.task_id = ? ORDER BY s.created_at').bind(actor.orgId, task.id).all(),
    db.prepare('SELECT a.id, a.status, a.created_at, a.expires_at, a.volunteer_id, v.name FROM asks a JOIN volunteers v ON v.id = a.volunteer_id WHERE a.org_id = ? AND a.task_id = ? ORDER BY a.created_at').bind(actor.orgId, task.id).all(),
    loadFields(db, actor.orgId),
    db.prepare('SELECT id, name FROM teams WHERE org_id = ?').bind(actor.orgId).all<{ id: string; name: string }>(),
    candidates(c.env, actor.orgId, task, now),
  ]);
  const holding = await holdingCount(db, task.id);
  const openSpots = Math.max(0, task.peopleNeeded - holding);
  const fits = all.filter((x) => x.reason === null);
  const nextGroup =
    task.status !== 'open' || openSpots === 0
      ? []
      : task.askMode === 'everyone'
        ? fits.map((x) => x.volunteer.id)
        : task.askMode === 'few'
          ? fits.slice(0, batchSize(task, openSpots)).map((x) => x.volunteer.id)
          : [];
  const teamName = new Map(teams.results.map((t) => [t.id, t.name]));
  return c.json({
    task,
    requirementLines: task.requirements.map((r) => requirementText(r, fields, (id) => teamName.get(id) ?? 'unknown')),
    holding,
    openSpots,
    spots: spots.results,
    asks: asks.results,
    candidates: all.map((x) => ({ id: x.volunteer.id, name: x.volunteer.name, reason: x.reason, standing: standing(x.volunteer, null, now), lastAskedAt: x.volunteer.lastAskedAt })),
    nextGroup,
    roundDue: task.status === 'open' && openSpots > 0 && (task.nextRoundAt === null || task.nextRoundAt <= now),
    publicUrl: task.publish && task.status !== 'draft' ? `${c.env.APP_URL}/t/${task.id}` : null,
    atproto: { uri: row?.at_uri ?? null, eventUri: row?.at_event_uri ?? null, error: row?.at_error ?? null },
  });
});

taskRoutes.patch('/tasks/:taskId', async (c) => {
  const actor = c.get('actor');
  const task = await taskFor(c, c.req.param('taskId'));
  mustManageTask(actor, task.teamId);
  if (task.status === 'done' || task.status === 'canceled') fail(409, "This task is finished and can't change.");
  const body = await c.req.json().catch(() => ({}));
  const input = await readTaskInput(c.env.DB, actor.orgId, body, task);
  mustManageTask(actor, input.teamId);
  const holding = await holdingCount(c.env.DB, task.id);
  if (input.peopleNeeded < holding) fail(409, `${holding} people already said yes. Ask someone to drop out first.`);
  const now = c.get('now');
  const status = task.status === 'filled' && input.peopleNeeded > holding ? 'open' : task.status === 'open' && input.peopleNeeded <= holding ? 'filled' : task.status;
  await c.env.DB.prepare(
    `UPDATE tasks SET team_id = ?, title = ?, description = ?, contact = ?, timing = ?, starts_at = ?, ends_at = ?, due_at = ?, place_public = ?,
      place_private = ?, people_needed = ?, requirements_json = ?, ask_mode = ?, ask_batch = ?, ask_wait_hours = ?, publish = ?, status = ?, updated_at = ?
     WHERE id = ? AND org_id = ?`,
  )
    .bind(
      input.teamId, input.title, input.description, input.contact, input.timing, input.startsAt, input.endsAt, input.dueAt, input.placePublic,
      input.placePrivate, input.peopleNeeded, JSON.stringify(input.requirements), input.askMode, input.askBatch, input.askWaitHours,
      input.publish ? 1 : 0, status, now, task.id, actor.orgId,
    )
    .run();
  await syncTask(c.env, actor.orgId, task.id);
  return c.json({ ok: true });
});

taskRoutes.post('/tasks/:taskId/open', async (c) => {
  const task = await taskFor(c, c.req.param('taskId'));
  mustManageTask(c.get('actor'), task.teamId);
  await openTask(c.env, c.get('actor').orgId, task.id, c.get('now'));
  return c.json({ ok: true });
});

taskRoutes.post('/tasks/:taskId/cancel', async (c) => {
  const actor = c.get('actor');
  const task = await taskFor(c, c.req.param('taskId'));
  mustManageTask(actor, task.teamId);
  if (task.status === 'done' || task.status === 'canceled') fail(409, 'This task is already finished.');
  const now = c.get('now');
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE tasks SET status = 'canceled', updated_at = ? WHERE id = ? AND org_id = ?").bind(now, task.id, actor.orgId),
    c.env.DB.prepare("UPDATE asks SET status = 'closed' WHERE task_id = ? AND status = 'waiting'").bind(task.id),
    logEvent(c.env.DB, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'canceled', objectType: 'task', objectId: task.id, at: now }),
  ]);
  await syncTask(c.env, actor.orgId, task.id);
  return c.json({ ok: true });
});

taskRoutes.delete('/tasks/:taskId', async (c) => {
  const actor = c.get('actor');
  const task = await taskFor(c, c.req.param('taskId'));
  mustManageTask(actor, task.teamId);
  if (task.status !== 'draft') fail(409, 'Only drafts can be deleted. Cancel it instead.');
  await c.env.DB.prepare('DELETE FROM tasks WHERE id = ? AND org_id = ?').bind(task.id, actor.orgId).run();
  return c.json({ ok: true });
});

/** Ask people. Returns each person's private link and a message to paste. */
taskRoutes.post('/tasks/:taskId/ask', async (c) => {
  const actor = c.get('actor');
  const task = await taskFor(c, c.req.param('taskId'));
  mustManageTask(actor, task.teamId);
  const body = await c.req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.volunteerIds) ? body.volunteerIds.filter((x: unknown) => typeof x === 'string').slice(0, 500) : [];
  if (ids.length === 0) fail(400, 'Choose at least one person to ask.');
  return c.json(await createAsks(c.env, actor.orgId, task.id, ids, actor.memberId, c.get('now')));
});

taskRoutes.post('/asks/:askId/link', async (c) => {
  const actor = c.get('actor');
  const ask = await c.env.DB.prepare('SELECT task_id FROM asks WHERE id = ? AND org_id = ?').bind(c.req.param('askId'), actor.orgId).first<{ task_id: string }>();
  if (!ask) fail(404, 'Not found');
  const task = await taskFor(c, ask.task_id);
  mustManageTask(actor, task.teamId);
  return c.json(await renewLink(c.env, actor.orgId, c.req.param('askId'), c.get('now')));
});

taskRoutes.post('/spots/:spotId/missed', async (c) => {
  const actor = c.get('actor');
  const spot = await c.env.DB.prepare('SELECT task_id, status FROM spots WHERE id = ? AND org_id = ?').bind(c.req.param('spotId'), actor.orgId).first<{ task_id: string; status: string }>();
  if (!spot) fail(404, 'Not found');
  const task = await taskFor(c, spot.task_id);
  mustManageTask(actor, task.teamId);
  const body = await c.req.json().catch(() => ({}));
  const next = body.missed === false ? 'done' : 'missed';
  if (spot.status !== 'done' && spot.status !== 'missed') fail(409, 'Only completed tasks can have no-shows.');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE spots SET status = ?, updated_at = ? WHERE id = ? AND org_id = ?').bind(next, c.get('now'), c.req.param('spotId'), actor.orgId),
    logEvent(c.env.DB, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: `marked_${next}`, objectType: 'spot', objectId: c.req.param('spotId'), at: c.get('now') }),
  ]);
  return c.json({ ok: true });
});

/** The short list of things to do now. */
taskRoutes.get('/today', async (c) => {
  const actor = c.get('actor');
  const now = c.get('now');
  const db = c.env.DB;
  await sweep(c.env, now, actor.orgId);
  const org = (await loadOrg(db, actor.orgId))!;
  const { results } = await db.prepare("SELECT * FROM tasks WHERE org_id = ? AND status IN ('draft', 'open', 'filled')").bind(actor.orgId).all();
  const items: Record<string, unknown>[] = [];
  const { taken, waiting } = await counts(db, actor.orgId);

  for (const row of results) {
    const task = toTask(row);
    const atError = (row as { at_error: string | null }).at_error;
    if (atError) items.push({ kind: 'atproto_error', taskId: task.id, title: task.title, message: atError });
    if (task.status === 'draft') {
      items.push({ kind: 'draft', taskId: task.id, title: task.title });
      continue;
    }
    if (task.status !== 'open') continue;
    const holding = taken.get(task.id) ?? 0;
    const openSpots = task.peopleNeeded - holding;
    if (openSpots <= 0) continue;
    const soon = task.timing === 'at_time' && task.startsAt !== null && task.startsAt - now < 2 * DAY;
    const roundDue = task.nextRoundAt === null || task.nextRoundAt <= now || (waiting.get(task.id) ?? 0) === 0;
    if (!roundDue && !soon) continue;
    const fits = (await candidates(c.env, actor.orgId, task, now)).filter((x) => x.reason === null).length;
    items.push({
      kind: fits > 0 ? 'ask_next' : 'no_one_left',
      taskId: task.id,
      title: task.title,
      openSpots,
      fits,
      startsAt: task.startsAt,
      soon,
      firstRound: task.nextRoundAt === null,
    });
  }

  const people = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN last_asked_at IS NULL AND status = 'active' AND contact_ok_at IS NOT NULL AND (email IS NOT NULL OR phone IS NOT NULL) THEN 1 ELSE 0 END) AS never_asked,
         SUM(CASE WHEN status = 'paused' AND paused_reason = 'no_answer' THEN 1 ELSE 0 END) AS paused_no_answer
       FROM volunteers WHERE org_id = ?`,
    )
    .bind(actor.orgId)
    .first<{ never_asked: number | null; paused_no_answer: number | null }>();
  if (people?.never_asked) items.push({ kind: 'never_asked', count: people.never_asked });
  if (people?.paused_no_answer) {
    const { results: names } = await db
      .prepare("SELECT id, name FROM volunteers WHERE org_id = ? AND status = 'paused' AND paused_reason = 'no_answer' ORDER BY name LIMIT 5")
      .bind(actor.orgId)
      .all();
    items.push({ kind: 'paused_no_answer', count: people.paused_no_answer, people: names });
  }
  const { results: imports } = await db
    .prepare("SELECT id, file_name, set_aside_json FROM imports WHERE org_id = ? AND set_aside_cleared = 0 AND set_aside_json != '[]' ORDER BY created_at DESC LIMIT 5")
    .bind(actor.orgId)
    .all<{ id: string; file_name: string; set_aside_json: string }>();
  for (const imp of imports) {
    items.push({ kind: 'set_aside', importId: imp.id, fileName: imp.file_name, count: JSON.parse(imp.set_aside_json).length });
  }

  // Measures each organization sees on its own (docs/SPEC.md, "How we'll know").
  const since = now - 30 * DAY;
  const m = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM volunteers WHERE org_id = ?1) AS people,
        (SELECT COUNT(DISTINCT volunteer_id) FROM asks WHERE org_id = ?1 AND created_at > ?2) AS asked,
        (SELECT COUNT(DISTINCT volunteer_id) FROM spots WHERE org_id = ?1 AND created_at > ?2) AS said_yes,
        (SELECT COUNT(*) FROM tasks WHERE org_id = ?1 AND updated_at > ?2 AND (status = 'filled' OR (status = 'done' AND id IN (SELECT task_id FROM spots WHERE org_id = ?1)))) AS filled`,
    )
    .bind(actor.orgId, since)
    .first<{ people: number; asked: number; said_yes: number; filled: number }>();

  return c.json({ orgName: org.name, items, measures: m });
});

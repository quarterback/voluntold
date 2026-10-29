import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { mustManageTask } from '../auth';
import { loadFields, loadOrg, loadTask, logEvent, toTask } from '../db';
import { cleanText, fail, newId } from '../util';
import { batchSize, DAY, requirementText } from '../../shared/rules';
import type { AskMode, Field, Requirement, RequirementOp, Task, Timing } from '../../shared/types';
import { activeCount, askMessage, candidates, createAsks, describeWhen, firstOffers, holdingCount, renewLink, shareTask, splitTask, sweep } from '../engine';
import { syncTask } from '../atproto';
import { standing } from '../../shared/sentences';
import { summarizeNeed } from './needs';
import { afterResponse, autoTag, tagIdsFor, tagIdsOf } from '../tags';

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

  const rawNeed = pick('needId', body.needId) as string | null | undefined;
  const needId = rawNeed ? String(rawNeed) : null;
  if (needId && !(await db.prepare('SELECT 1 FROM needs WHERE id = ? AND org_id = ?').bind(needId, orgId).first())) fail(400, "That need doesn't exist.");
  const rawEffort = pick('effortMinutes', body.effortMinutes);
  const effortMinutes = rawEffort === null || rawEffort === undefined || rawEffort === '' ? null : Number(rawEffort);
  if (effortMinutes !== null && (!Number.isInteger(effortMinutes) || effortMinutes < 5 || effortMinutes > 24 * 60)) fail(400, 'Effort must be 5 minutes to 24 hours.');
  const rawFiles = pick('files', body.files);
  const files = (Array.isArray(rawFiles) ? rawFiles : []).slice(0, 10).map((f: Record<string, unknown>) => {
    const url = cleanText(f?.url, 1000);
    if (!/^https?:\/\//.test(url)) fail(400, 'File links must start with https://');
    return { name: cleanText(f?.name, 120) || url.split('/').pop() || 'File', url };
  });

  return {
    needId,
    remote: Boolean(pick('remote', body.remote)),
    effortMinutes,
    bring: cleanText(pick('bring', body.bring), 300),
    files,
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
  const [{ taken, waiting }, tags] = await Promise.all([counts(c.env.DB, orgId), tagIdsFor(c.env.DB, orgId, 'task')]);
  return c.json({
    tasks: results.map((r) => {
      const t = toTask(r);
      return { ...t, taken: taken.get(t.id) ?? 0, waiting: waiting.get(t.id) ?? 0, atError: (r as { at_error: string | null }).at_error, tags: tags.get(t.id) ?? [] };
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
        people_needed, requirements_json, ask_mode, ask_batch, ask_wait_hours, publish, status, created_by, created_at, updated_at,
        need_id, remote, effort_minutes, bring, files_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, actor.orgId, input.teamId, input.title, input.description, input.contact, input.timing, input.startsAt, input.endsAt, input.dueAt,
      input.placePublic, input.placePrivate, input.peopleNeeded, JSON.stringify(input.requirements), input.askMode, input.askBatch,
      input.askWaitHours, input.publish ? 1 : 0, actor.memberId, now, now,
      input.needId, input.remote ? 1 : 0, input.effortMinutes, input.bring, JSON.stringify(input.files),
    ),
    logEvent(c.env.DB, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'created', objectType: 'task', objectId: id, at: now }),
  ]);
  if (body.open === true) await openTask(c.env, actor.orgId, id, now);
  afterResponse(c, autoTag(c.env, actor.orgId, 'task', [{ id, text: await taskTagText(c.env.DB, actor.orgId, input) }], now));
  return c.json({ id }, 201);
});

/** What the model sees when it tags a task. No names of people. */
async function taskTagText(db: D1Database, orgId: string, t: Pick<Task, 'title' | 'description' | 'timing' | 'startsAt' | 'endsAt' | 'dueAt' | 'placePublic' | 'remote' | 'effortMinutes' | 'bring' | 'requirements' | 'peopleNeeded'>): Promise<string> {
  const fields = await loadFields(db, orgId);
  const { results: teams } = await db.prepare('SELECT id, name FROM teams WHERE org_id = ?').bind(orgId).all<{ id: string; name: string }>();
  const teamName = new Map(teams.map((x) => [x.id, x.name]));
  const org = await loadOrg(db, orgId);
  return [
    `Title: ${t.title}`,
    t.description ? `Description: ${t.description}` : '',
    describeWhen(t, org?.time_zone) ? `When: ${describeWhen(t, org?.time_zone)}` : 'When: no date',
    t.placePublic ? `Location: ${t.placePublic}` : '',
    t.remote ? 'Remote' : '',
    t.effortMinutes ? `Effort: ${t.effortMinutes} minutes` : '',
    t.bring ? `Bring: ${t.bring}` : '',
    `Volunteers needed: ${t.peopleNeeded}`,
    ...t.requirements.map((r) => `Requires: ${requirementText(r, fields, (id) => teamName.get(id) ?? 'team')}`),
  ].filter(Boolean).join('\n');
}

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
  const [spots, asks, fields, teams, all, tags] = await Promise.all([
    db.prepare('SELECT s.id, s.status, s.volunteer_id, s.created_at, v.name FROM spots s JOIN volunteers v ON v.id = s.volunteer_id WHERE s.org_id = ? AND s.task_id = ? ORDER BY s.created_at').bind(actor.orgId, task.id).all(),
    db.prepare('SELECT a.id, a.status, a.created_at, a.expires_at, a.volunteer_id, a.batch_no, v.name FROM asks a JOIN volunteers v ON v.id = a.volunteer_id WHERE a.org_id = ? AND a.task_id = ? ORDER BY a.created_at').bind(actor.orgId, task.id).all(),
    loadFields(db, actor.orgId),
    db.prepare('SELECT id, name FROM teams WHERE org_id = ?').bind(actor.orgId).all<{ id: string; name: string }>(),
    candidates(c.env, actor.orgId, task, now),
    tagIdsOf(db, actor.orgId, 'task', task.id),
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
  // Each batch of asks, with how it went.
  const batches = new Map<number, { no: number; at: number; asked: number; yes: number; declined: number; waiting: number; noReply: number }>();
  for (const a of asks.results as { status: string; created_at: number; batch_no?: number }[]) {
    const n = (a as { batch_no?: number }).batch_no ?? 1;
    if (n === 0) continue;
    const b = batches.get(n) ?? { no: n, at: a.created_at, asked: 0, yes: 0, declined: 0, waiting: 0, noReply: 0 };
    b.asked++;
    if (a.status === 'yes') b.yes++;
    else if (a.status === 'no') b.declined++;
    else if (a.status === 'waiting') b.waiting++;
    else b.noReply++;
    batches.set(n, b);
  }
  const { results: partnerRows } = await db
    .prepare('SELECT o.id, o.name FROM partners p JOIN orgs o ON o.id = p.partner_org_id WHERE p.org_id = ? ORDER BY o.name')
    .bind(actor.orgId)
    .all<{ id: string; name: string }>();
  const partners = await Promise.all(partnerRows.map(async (p) => ({ ...p, active: await activeCount(db, p.id) })));
  const span = task.timing === 'at_time' && task.startsAt && task.endsAt ? task.endsAt - task.startsAt : 0;
  const canSplit = ['open', 'draft'].includes(task.status) && openSpots > 0 && span >= 2 * 60 * 60 * 1000;
  let splitFits = 0;
  if (canSplit) {
    const half = { ...task, endsAt: task.startsAt! + Math.floor(span / 2), effortMinutes: null };
    splitFits = (await candidates(c.env, actor.orgId, half, now)).filter((x) => x.reason === null).length - fits.length;
  }
  return c.json({
    batches: [...batches.values()].sort((a, b) => a.no - b.no),
    nextBatch: task.status === 'open' && openSpots > 0 && task.askMode === 'few' ? { fits: fits.length, size: nextGroup.length, at: task.nextRoundAt } : null,
    options: { canSplit, splitFits: Math.max(0, splitFits), partners },
    task,
    tags,
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
      place_private = ?, people_needed = ?, requirements_json = ?, ask_mode = ?, ask_batch = ?, ask_wait_hours = ?, publish = ?, status = ?, updated_at = ?,
      need_id = ?, remote = ?, effort_minutes = ?, bring = ?, files_json = ?
     WHERE id = ? AND org_id = ?`,
  )
    .bind(
      input.teamId, input.title, input.description, input.contact, input.timing, input.startsAt, input.endsAt, input.dueAt, input.placePublic,
      input.placePrivate, input.peopleNeeded, JSON.stringify(input.requirements), input.askMode, input.askBatch, input.askWaitHours,
      input.publish ? 1 : 0, status, now, input.needId, input.remote ? 1 : 0, input.effortMinutes, input.bring, JSON.stringify(input.files),
      task.id, actor.orgId,
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
  // Everything the task owns goes with it. Spots come before asks: a spot
  // points at the ask it came from.
  const del = (sql: string) => c.env.DB.prepare(sql).bind(task.id, actor.orgId);
  await c.env.DB.batch([
    del('DELETE FROM spots WHERE task_id = ? AND org_id = ?'),
    del('DELETE FROM asks WHERE task_id = ? AND org_id = ?'),
    del('DELETE FROM reports WHERE task_id = ? AND org_id = ?'),
    del('DELETE FROM offer_skips WHERE task_id = ? AND org_id = ?'),
    c.env.DB.prepare("DELETE FROM taggings WHERE object_type = 'task' AND object_id = ? AND org_id = ?").bind(task.id, actor.orgId),
    del('DELETE FROM tasks WHERE id = ? AND org_id = ?'),
  ]);
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

// The demo tour: a fresh link for the latest waiting ask in the sample
// organization, so the person can open the volunteer's page.
taskRoutes.post('/demo/volunteer-link', async (c) => {
  const actor = c.get('actor');
  const org = await loadOrg(c.env.DB, actor.orgId);
  if (!org || org.sample !== 1) fail(404, 'Not found');
  const ask = await c.env.DB.prepare("SELECT id FROM asks WHERE org_id = ? AND status = 'waiting' ORDER BY created_at DESC LIMIT 1").bind(actor.orgId).first<{ id: string }>();
  if (!ask) fail(409, 'Ask people first.');
  return c.json(await renewLink(c.env, actor.orgId, ask.id, c.get('now')));
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

taskRoutes.post('/tasks/:taskId/split', async (c) => {
  const actor = c.get('actor');
  const task = await taskFor(c, c.req.param('taskId'));
  mustManageTask(actor, task.teamId);
  const body = await c.req.json().catch(() => ({}));
  const ids = await splitTask(c.env, actor.orgId, task.id, Number(body.parts ?? 2), actor.memberId, c.get('now'));
  for (const id of ids) await syncTask(c.env, actor.orgId, id);
  return c.json({ ids });
});

taskRoutes.post('/tasks/:taskId/share', async (c) => {
  const actor = c.get('actor');
  const task = await taskFor(c, c.req.param('taskId'));
  mustManageTask(actor, task.teamId);
  const body = await c.req.json().catch(() => ({}));
  const fields = await loadFields(c.env.DB, actor.orgId);
  const { results: teams } = await c.env.DB.prepare('SELECT id, name FROM teams WHERE org_id = ?').bind(actor.orgId).all<{ id: string; name: string }>();
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const lines = task.requirements.map((r) => requirementText(r, fields, (id) => teamName.get(id) ?? 'team'));
  const id = await shareTask(c.env, actor.orgId, task.id, String(body.partnerOrgId ?? ''), lines, actor.memberId, c.get('now'));
  return c.json({ id });
});

/** First offers waiting for a coordinator's approval. */
taskRoutes.get('/offers', async (c) => {
  const actor = c.get('actor');
  const now = c.get('now');
  await sweep(c.env, now, actor.orgId);
  const [offers, fields, org] = await Promise.all([firstOffers(c.env, actor.orgId, now), loadFields(c.env.DB, actor.orgId), loadOrg(c.env.DB, actor.orgId)]);
  const needs = new Map<string, string>();
  for (const o of offers) {
    if (o.task.needId && !needs.has(o.task.needId)) {
      const n = await c.env.DB.prepare('SELECT title FROM needs WHERE id = ?').bind(o.task.needId).first<{ title: string }>();
      if (n) needs.set(o.task.needId, n.title);
    }
  }
  const skills = fields.find((f) => f.type === 'many');
  return c.json({
    offers: offers.map((o) => ({
      volunteer: {
        id: o.volunteer.id, name: o.volunteer.name, createdAt: o.volunteer.createdAt, tier: o.volunteer.tier, hoursWeek: o.volunteer.hoursWeek,
        days: o.volunteer.days, remoteOk: o.volunteer.remoteOk, skills: skills ? [o.volunteer.values[skills.id] ?? []].flat() : [],
      },
      task: o.task,
      needTitle: o.task.needId ? needs.get(o.task.needId) ?? null : null,
      message: askMessage(o.volunteer.name, o.task, org!.name, '[link]', org!.time_zone),
    })),
  });
});

taskRoutes.post('/offers/skip', async (c) => {
  const actor = c.get('actor');
  const body = await c.req.json().catch(() => ({}));
  await c.env.DB.prepare('INSERT OR REPLACE INTO offer_skips (org_id, volunteer_id, task_id, at) VALUES (?, ?, ?, ?)')
    .bind(actor.orgId, String(body.volunteerId ?? ''), String(body.taskId ?? ''), c.get('now'))
    .run();
  return c.json({ ok: true });
});

taskRoutes.post('/reports/:reportId/resolve', async (c) => {
  const actor = c.get('actor');
  await c.env.DB.prepare('UPDATE reports SET resolved_at = ? WHERE id = ? AND org_id = ?').bind(c.get('now'), c.req.param('reportId'), actor.orgId).run();
  return c.json({ ok: true });
});

/** The decisions to make now, this week's work, and how capacity is being used. */
taskRoutes.get('/today', async (c) => {
  const actor = c.get('actor');
  const now = c.get('now');
  const db = c.env.DB;
  await sweep(c.env, now, actor.orgId);
  const org = (await loadOrg(db, actor.orgId))!;
  const items: Record<string, unknown>[] = [];

  const offers = await firstOffers(c.env, actor.orgId, now);
  if (offers.length) items.push({ kind: 'first_offers', count: offers.length, names: offers.slice(0, 3).map((o) => o.volunteer.name) });

  const { results: needRows } = await db.prepare("SELECT id FROM needs WHERE org_id = ? AND status != 'done'").bind(actor.orgId).all<{ id: string }>();
  for (const r of needRows) {
    const n = await summarizeNeed(c.env, actor.orgId, r.id, now);
    if (n && (n.counts.canOffer > 0 || n.counts.gaps > 0)) {
      items.push({ kind: 'need', needId: r.id, title: n.need.title, canOffer: n.counts.canOffer, assignments: n.counts.assignments, gaps: n.counts.gaps });
    }
  }

  const { results } = await db.prepare("SELECT * FROM tasks WHERE org_id = ? AND status IN ('draft', 'open', 'filled')").bind(actor.orgId).all();
  const { taken, waiting } = await counts(db, actor.orgId);
  for (const row of results) {
    const task = toTask(row);
    const atError = (row as { at_error: string | null }).at_error;
    if (atError) items.push({ kind: 'atproto_error', taskId: task.id, title: task.title, message: atError });
    if (task.status === 'draft') {
      if (!task.needId) items.push({ kind: 'draft', taskId: task.id, title: task.title });
      continue;
    }
    if (task.status !== 'open') continue;
    const holding = taken.get(task.id) ?? 0;
    if (task.peopleNeeded - holding <= 0) continue;
    // Work in a need shows on the need's row until its first batch goes out.
    if (task.needId && task.nextRoundAt === null) continue;
    const roundDue = task.nextRoundAt === null || task.nextRoundAt <= now || (waiting.get(task.id) ?? 0) === 0;
    const soon = task.timing === 'at_time' && task.startsAt !== null && task.startsAt - now < 7 * DAY;
    if (!roundDue && !soon) continue;
    const fits = (await candidates(c.env, actor.orgId, task, now)).filter((x) => x.reason === null).length;
    const batch = await db.prepare('SELECT MAX(batch_no) AS n FROM asks WHERE task_id = ?').bind(task.id).first<{ n: number | null }>();
    items.push({
      kind: fits > 0 ? 'ask_next' : 'no_one_left',
      taskId: task.id, title: task.title, startsAt: task.startsAt, endsAt: task.endsAt, timing: task.timing, dueAt: task.dueAt,
      holding, peopleNeeded: task.peopleNeeded, fits, nextBatch: (batch?.n ?? 0) + 1, nextAt: roundDue ? null : task.nextRoundAt,
    });
  }

  const { results: reports } = await db
    .prepare(
      `SELECT r.id, r.body, r.task_id, t.title, v.name FROM reports r JOIN tasks t ON t.id = r.task_id JOIN volunteers v ON v.id = r.volunteer_id
       WHERE r.org_id = ? AND r.resolved_at IS NULL ORDER BY r.created_at DESC LIMIT 5`,
    )
    .bind(actor.orgId)
    .all();
  for (const r of reports) items.push({ kind: 'report', reportId: r.id, taskId: r.task_id, title: r.title, name: r.name, body: r.body });

  const { results: paused } = await db
    .prepare("SELECT id, name FROM volunteers WHERE org_id = ? AND status = 'paused' AND paused_reason = 'no_answer' ORDER BY name")
    .bind(actor.orgId)
    .all<{ id: string; name: string }>();
  if (paused.length > 0 && paused.length <= 2) for (const p of paused) items.push({ kind: 'paused_person', volunteerId: p.id, name: p.name });
  else if (paused.length > 2) items.push({ kind: 'paused_no_answer', count: paused.length, people: paused.slice(0, 3) });

  const { results: imports } = await db
    .prepare("SELECT id, file_name, set_aside_json FROM imports WHERE org_id = ? AND set_aside_cleared = 0 AND set_aside_json != '[]' ORDER BY created_at DESC LIMIT 5")
    .bind(actor.orgId)
    .all<{ id: string; file_name: string; set_aside_json: string }>();
  for (const imp of imports) items.push({ kind: 'set_aside', importId: imp.id, fileName: imp.file_name, count: JSON.parse(imp.set_aside_json).length });

  // This week's work at a set time, with how full it is.
  const { results: week } = await db
    .prepare("SELECT * FROM tasks WHERE org_id = ? AND status IN ('open', 'filled') AND timing = 'at_time' AND starts_at >= ? AND starts_at < ? ORDER BY starts_at")
    .bind(actor.orgId, now, now + 7 * DAY)
    .all();
  const thisWeek = week.map((r) => {
    const t = toTask(r);
    return { id: t.id, title: t.title, startsAt: t.startsAt, endsAt: t.endsAt, holding: taken.get(t.id) ?? 0, peopleNeeded: t.peopleNeeded };
  });

  // Capacity: are approved people getting offered work, and coming back?
  const cap = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM volunteers WHERE org_id = ?1 AND status != 'stopped' AND contact_ok_at IS NOT NULL) AS approved,
        (SELECT COUNT(*) FROM volunteers WHERE org_id = ?1 AND status = 'active' AND contact_ok_at IS NOT NULL AND last_asked_at IS NULL) AS never_offered,
        (SELECT COUNT(*) FROM (SELECT volunteer_id FROM spots WHERE org_id = ?1 AND status IN ('holding', 'done') GROUP BY volunteer_id HAVING COUNT(*) >= 2)) AS yes_twice`,
    )
    .bind(actor.orgId)
    .first<{ approved: number; never_offered: number; yes_twice: number }>();
  const { results: firstAsks } = await db
    // People who joined in the last 90 days: how long until their first ask.
    .prepare('SELECT (MIN(a.created_at) - v.created_at) AS wait FROM asks a JOIN volunteers v ON v.id = a.volunteer_id WHERE a.org_id = ? AND v.created_at > ? GROUP BY a.volunteer_id')
    .bind(actor.orgId, now - 90 * DAY)
    .all<{ wait: number }>();
  const waits = firstAsks.map((r) => Math.max(0, r.wait)).sort((a, b) => a - b);
  const medianDays = waits.length ? Math.round(waits[Math.floor(waits.length / 2)] / DAY) : null;

  return c.json({ orgName: org.name, timeZone: org.time_zone, items, thisWeek, capacity: { ...cap, daysToFirstOffer: medianDays } });
});

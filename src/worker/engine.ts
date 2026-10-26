// Asking people, answering, and the sweep that moves things along with time.

import type { Env } from './env';
import type { Task, Volunteer } from '../shared/types';
import {
  DAY,
  HOUR,
  LINK_LIFETIME,
  UNANSWERED_PAUSE_AFTER,
  askExpiry,
  byLongestWait,
  finishedAt,
  pauseOver,
  taskSpan,
  whyNotFit,
  type Busy,
  type NoFitReason,
} from '../shared/rules';
import { loadFields, loadOrg, loadTask, loadVolunteers, logEvent, toTask } from './db';
import { fail, hashToken, newId, newToken } from './util';
import { syncTask } from './atproto';
import { day, timeRange } from '../shared/time';

export interface Candidate {
  volunteer: Volunteer;
  reason: NoFitReason | null;
}

/** Everyone in the organization, with whether they fit this task, longest wait first. */
export async function candidates(env: Env, orgId: string, task: Task, now: number): Promise<Candidate[]> {
  const db = env.DB;
  const [org, fields, volunteers, recent, busyRows, asked] = await Promise.all([
    loadOrg(db, orgId),
    loadFields(db, orgId),
    loadVolunteers(db, orgId),
    db
      .prepare('SELECT volunteer_id, COUNT(*) AS n FROM asks WHERE org_id = ? AND created_at > ? GROUP BY volunteer_id')
      .bind(orgId, now - 7 * DAY)
      .all<{ volunteer_id: string; n: number }>(),
    db
      .prepare(
        `SELECT s.volunteer_id, t.starts_at, t.ends_at FROM spots s JOIN tasks t ON t.id = s.task_id
         WHERE s.org_id = ? AND s.status = 'holding' AND t.timing = 'at_time' AND t.id != ?`,
      )
      .bind(orgId, task.id)
      .all<{ volunteer_id: string; starts_at: number; ends_at: number }>(),
    db.prepare('SELECT volunteer_id FROM asks WHERE org_id = ? AND task_id = ?').bind(orgId, task.id).all<{ volunteer_id: string }>(),
  ]);
  if (!org) fail(404, 'Not found');
  const asksByVolunteer = new Map(recent.results.map((r) => [r.volunteer_id, r.n]));
  const busy = new Map<string, Busy[]>();
  for (const r of busyRows.results) {
    busy.set(r.volunteer_id, [...(busy.get(r.volunteer_id) ?? []), { start: r.starts_at, end: r.ends_at }]);
  }
  const askedIds = new Set(asked.results.map((r) => r.volunteer_id));
  return volunteers
    .map((volunteer) => ({
      volunteer,
      reason: whyNotFit(volunteer, task, fields, {
        now,
        weeklyLimit: org.weekly_ask_limit,
        asksLast7Days: asksByVolunteer.get(volunteer.id) ?? 0,
        busy: busy.get(volunteer.id) ?? [],
        alreadyAsked: askedIds.has(volunteer.id),
        timeZone: org.time_zone,
      }),
    }))
    .sort((a, b) => byLongestWait(a.volunteer, b.volunteer));
}

export async function holdingCount(db: D1Database, taskId: string): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM spots WHERE task_id = ? AND status = 'holding'").bind(taskId).first<{ n: number }>();
  return row?.n ?? 0;
}

export interface NewAsk {
  askId: string;
  volunteerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  link: string;
  message: string;
}

export function askMessage(name: string, task: Task, orgName: string, link: string, timeZone?: string): string {
  const first = name.split(/\s+/)[0] || name;
  const when = describeWhen(task, timeZone);
  return `Hi ${first}, can you help ${orgName} with "${task.title}"${when ? ` ${when}` : ''}? Answer here: ${link}`;
}

export function describeWhen(task: Pick<Task, 'timing' | 'startsAt' | 'endsAt' | 'dueAt'>, timeZone?: string): string {
  if (task.timing === 'at_time' && task.startsAt && task.endsAt) {
    return `on ${day(task.startsAt, timeZone, true)}, ${timeRange(task.startsAt, task.endsAt, timeZone)}`;
  }
  if (task.timing === 'by_date' && task.dueAt) return `by ${day(task.dueAt, timeZone, true)}`;
  return '';
}

/**
 * Creates asks for the chosen people. Every person is checked again here, so
 * the weekly limit and requirements hold whatever the browser sent.
 */
export async function createAsks(
  env: Env,
  orgId: string,
  taskId: string,
  volunteerIds: string[],
  actorId: string,
  now: number,
): Promise<{ asks: NewAsk[]; skipped: { volunteerId: string; reason: NoFitReason | 'unknown' }[] }> {
  const db = env.DB;
  // Bring expiries and pauses up to date first, so "who fits" is current.
  await sweep(env, now, orgId);
  const task = await loadTask(db, orgId, taskId);
  if (!task) fail(404, 'Not found');
  if (task.status !== 'open') fail(409, 'Publish the task before asking people.');
  const org = await loadOrg(db, orgId);
  const all = await candidates(env, orgId, task, now);
  const byId = new Map(all.map((c) => [c.volunteer.id, c]));

  const lastBatch = await db.prepare('SELECT MAX(batch_no) AS n FROM asks WHERE task_id = ?').bind(task.id).first<{ n: number | null }>();
  const batchNo = (lastBatch?.n ?? 0) + 1;
  const asks: NewAsk[] = [];
  const skipped: { volunteerId: string; reason: NoFitReason | 'unknown' }[] = [];
  const statements: D1PreparedStatement[] = [];
  for (const id of [...new Set(volunteerIds)]) {
    const c = byId.get(id);
    if (!c) {
      skipped.push({ volunteerId: id, reason: 'unknown' });
      continue;
    }
    if (c.reason) {
      skipped.push({ volunteerId: id, reason: c.reason });
      continue;
    }
    const token = newToken();
    const askId = newId();
    const link = `${env.APP_URL}/v/${token}`;
    statements.push(
      db
        .prepare(
          `INSERT INTO asks (id, org_id, task_id, volunteer_id, token_hash, status, created_at, expires_at, link_expires_at, batch_no)
           VALUES (?, ?, ?, ?, ?, 'waiting', ?, ?, ?, ?)`,
        )
        .bind(askId, orgId, task.id, id, await hashToken(env, token), now, askExpiry(task, now), now + LINK_LIFETIME, batchNo),
      db.prepare('UPDATE volunteers SET last_asked_at = ?, updated_at = ? WHERE id = ? AND org_id = ?').bind(now, now, id, orgId),
      logEvent(db, { orgId, actorKind: 'member', actorId, verb: 'asked', objectType: 'ask', objectId: askId, at: now }),
    );
    asks.push({
      askId,
      volunteerId: id,
      name: c.volunteer.name,
      email: c.volunteer.email,
      phone: c.volunteer.phone,
      link,
      message: askMessage(c.volunteer.name, task, org!.name, link, org!.time_zone),
    });
  }
  if (asks.length > 0 && task.askMode === 'few') {
    statements.push(db.prepare('UPDATE tasks SET next_round_at = ? WHERE id = ?').bind(now + task.askWaitHours * HOUR, task.id));
  }
  if (statements.length > 0) await db.batch(statements);
  return { asks, skipped };
}

/** Makes a new link for an ask. The old link stops working. */
export async function renewLink(env: Env, orgId: string, askId: string, now: number) {
  const row = await env.DB.prepare(
    'SELECT a.*, v.name, v.email, v.phone FROM asks a JOIN volunteers v ON v.id = a.volunteer_id WHERE a.org_id = ? AND a.id = ?',
  )
    .bind(orgId, askId)
    .first<{ task_id: string; volunteer_id: string; name: string; email: string | null; phone: string | null }>();
  if (!row) fail(404, 'Not found');
  const task = await loadTask(env.DB, orgId, row.task_id);
  const org = await loadOrg(env.DB, orgId);
  const token = newToken();
  const tokenHash = await hashToken(env, token);
  await env.DB.batch([
    env.DB.prepare('UPDATE asks SET token_hash = ?, link_expires_at = ?, revoked_at = NULL WHERE id = ? AND org_id = ?').bind(
      tokenHash,
      now + LINK_LIFETIME,
      askId,
      orgId,
    ),
    // Sessions opened from the old link end too.
    env.DB.prepare('DELETE FROM volunteer_sessions WHERE ask_id = ? AND org_id = ?').bind(askId, orgId),
  ]);
  const link = `${env.APP_URL}/v/${token}`;
  return { askId, volunteerId: row.volunteer_id, name: row.name, email: row.email, phone: row.phone, link, message: askMessage(row.name, task!, org!.name, link, org!.time_zone) };
}

function answeredSomething(db: D1Database, orgId: string, volunteerId: string, now: number): D1PreparedStatement {
  // Any answer resets the count of unanswered asks and lifts a pause that
  // came from not answering.
  return db
    .prepare(
      `UPDATE volunteers SET unanswered_streak = 0, updated_at = ?,
         status = CASE WHEN status = 'paused' AND paused_reason = 'no_answer' THEN 'active' ELSE status END,
         paused_reason = CASE WHEN paused_reason = 'no_answer' THEN NULL ELSE paused_reason END
       WHERE id = ? AND org_id = ?`,
    )
    .bind(now, volunteerId, orgId);
}

export type AnswerResult = 'yes' | 'no' | 'filled' | 'closed';

/**
 * A volunteer answers an ask. A yes takes a spot only if one is open, in a
 * single conditional insert, so two people can't both take the last spot.
 */
export async function answerAsk(
  env: Env,
  orgId: string,
  volunteerId: string,
  askId: string,
  answer: 'yes' | 'no',
  now: number,
): Promise<AnswerResult> {
  const db = env.DB;
  const ask = await db
    .prepare('SELECT * FROM asks WHERE id = ? AND org_id = ? AND volunteer_id = ?')
    .bind(askId, orgId, volunteerId)
    .first<{ task_id: string; status: string; revoked_at: number | null }>();
  if (!ask || ask.revoked_at) fail(404, 'Not found');
  const volunteer = await db.prepare('SELECT status FROM volunteers WHERE id = ? AND org_id = ?').bind(volunteerId, orgId).first<{ status: string }>();
  if (!volunteer || volunteer.status === 'stopped') fail(409, "You're unsubscribed.");
  const taskRow = await db.prepare('SELECT * FROM tasks WHERE id = ? AND org_id = ?').bind(ask.task_id, orgId).first();
  if (!taskRow) fail(404, 'Not found');
  const task = toTask(taskRow);

  if (answer === 'no') {
    await db.batch([
      db.prepare("UPDATE asks SET status = 'no', answered_at = ? WHERE id = ?").bind(now, askId),
      answeredSomething(db, orgId, volunteerId, now),
      logEvent(db, { orgId, actorKind: 'volunteer', actorId: volunteerId, verb: 'said_no', objectType: 'ask', objectId: askId, at: now }),
    ]);
    return 'no';
  }

  if (task.status === 'canceled' || task.status === 'done') {
    await db.batch([
      db.prepare("UPDATE asks SET status = 'closed' WHERE id = ? AND status IN ('waiting', 'expired')").bind(askId),
      answeredSomething(db, orgId, volunteerId, now),
    ]);
    return 'closed';
  }

  const spotId = newId();
  const insert = await db
    .prepare(
      `INSERT INTO spots (id, org_id, task_id, volunteer_id, ask_id, status, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?, 'holding', ?, ?
       WHERE (SELECT status FROM tasks WHERE id = ?) = 'open'
         AND (SELECT COUNT(*) FROM spots WHERE task_id = ? AND status = 'holding') < (SELECT people_needed FROM tasks WHERE id = ?)
         AND NOT EXISTS (SELECT 1 FROM spots WHERE task_id = ? AND volunteer_id = ? AND status = 'holding')`,
    )
    .bind(spotId, orgId, task.id, volunteerId, askId, now, now, task.id, task.id, task.id, task.id, volunteerId)
    .run();

  if (insert.meta.changes !== 1) {
    const already = await db
      .prepare("SELECT 1 FROM spots WHERE task_id = ? AND volunteer_id = ? AND status = 'holding'")
      .bind(task.id, volunteerId)
      .first();
    if (already) return 'yes';
    await db.batch([
      db.prepare("UPDATE asks SET status = 'closed' WHERE id = ? AND status IN ('waiting', 'expired')").bind(askId),
      answeredSomething(db, orgId, volunteerId, now),
    ]);
    return 'filled';
  }

  await db.batch([
    db.prepare("UPDATE asks SET status = 'yes', answered_at = ? WHERE id = ?").bind(now, askId),
    answeredSomething(db, orgId, volunteerId, now),
    db
      .prepare(
        `UPDATE tasks SET status = 'filled', updated_at = ?
         WHERE id = ? AND status = 'open' AND (SELECT COUNT(*) FROM spots WHERE task_id = ? AND status = 'holding') >= people_needed`,
      )
      .bind(now, task.id, task.id),
    db
      .prepare("UPDATE asks SET status = 'closed' WHERE task_id = ? AND status = 'waiting' AND (SELECT status FROM tasks WHERE id = ?) = 'filled'")
      .bind(task.id, task.id),
    logEvent(db, { orgId, actorKind: 'volunteer', actorId: volunteerId, verb: 'said_yes', objectType: 'spot', objectId: spotId, at: now }),
  ]);
  const after = await loadTask(db, orgId, task.id);
  if (after && after.status !== task.status) await syncTask(env, orgId, after.id);
  return 'yes';
}

/** "I can't make it": the spot reopens, and Today says to ask the next group. */
export async function cantMakeIt(env: Env, orgId: string, volunteerId: string, spotId: string, now: number) {
  const db = env.DB;
  const spot = await db
    .prepare("SELECT task_id FROM spots WHERE id = ? AND org_id = ? AND volunteer_id = ? AND status = 'holding'")
    .bind(spotId, orgId, volunteerId)
    .first<{ task_id: string }>();
  if (!spot) fail(404, 'Not found');
  const before = await loadTask(db, orgId, spot.task_id);
  await db.batch([
    db.prepare("UPDATE spots SET status = 'cant', updated_at = ? WHERE id = ?").bind(now, spotId),
    db.prepare("UPDATE tasks SET status = 'open', next_round_at = ?, updated_at = ? WHERE id = ? AND status = 'filled'").bind(now, now, spot.task_id),
    db.prepare("UPDATE tasks SET next_round_at = ? WHERE id = ? AND status = 'open'").bind(now, spot.task_id),
    logEvent(db, { orgId, actorKind: 'volunteer', actorId: volunteerId, verb: 'cant_make_it', objectType: 'spot', objectId: spotId, at: now }),
  ]);
  if (before?.status === 'filled') await syncTask(env, orgId, spot.task_id);
}

/**
 * Moves things along with time: asks expire, people who don't answer three
 * times in a row are paused, breaks end, and work is done when its time passes.
 * Runs from the cron trigger and before the coordinator's main screens load.
 */
export async function sweep(env: Env, now: number, orgId?: string): Promise<void> {
  const db = env.DB;
  const orgFilter = orgId ? ' AND org_id = ?' : '';
  const orgArgs = orgId ? [orgId] : [];

  const expired = await db
    .prepare(`SELECT id, org_id, volunteer_id FROM asks WHERE status = 'waiting' AND expires_at <= ?${orgFilter} ORDER BY expires_at`)
    .bind(now, ...orgArgs)
    .all<{ id: string; org_id: string; volunteer_id: string }>();
  const statements: D1PreparedStatement[] = [];
  for (const a of expired.results) {
    statements.push(
      db.prepare("UPDATE asks SET status = 'expired' WHERE id = ? AND status = 'waiting'").bind(a.id),
      db.prepare('UPDATE volunteers SET unanswered_streak = unanswered_streak + 1 WHERE id = ?').bind(a.volunteer_id),
      db
        .prepare(
          `UPDATE volunteers SET status = 'paused', paused_reason = 'no_answer', paused_until = NULL, updated_at = ?
           WHERE id = ? AND status = 'active' AND unanswered_streak >= ?`,
        )
        .bind(now, a.volunteer_id, UNANSWERED_PAUSE_AFTER),
    );
  }

  statements.push(
    db
      .prepare(
        `UPDATE volunteers SET status = 'active', paused_until = NULL, paused_reason = NULL, updated_at = ?
         WHERE status = 'paused' AND paused_until IS NOT NULL AND paused_until <= ?${orgFilter}`,
      )
      .bind(now, now, ...orgArgs),
  );

  const finishing = await db
    .prepare(
      `SELECT * FROM tasks WHERE status IN ('open', 'filled')
       AND ((timing = 'at_time' AND ends_at <= ?) OR (timing = 'by_date' AND due_at <= ?))${orgFilter}`,
    )
    .bind(now, now, ...orgArgs)
    .all();
  for (const row of finishing.results) {
    const task = toTask(row);
    if ((finishedAt(task) ?? Infinity) > now) continue;
    statements.push(
      db.prepare("UPDATE tasks SET status = 'done', updated_at = ? WHERE id = ?").bind(now, task.id),
      db.prepare("UPDATE spots SET status = 'done', updated_at = ? WHERE task_id = ? AND status = 'holding'").bind(now, task.id),
      db.prepare("UPDATE asks SET status = 'closed' WHERE task_id = ? AND status = 'waiting'").bind(task.id),
      logEvent(db, { orgId: (row as { org_id: string }).org_id, actorKind: 'system', actorId: null, verb: 'done', objectType: 'task', objectId: task.id, at: now }),
    );
  }
  if (statements.length > 0) await db.batch(statements);
  for (const row of finishing.results) {
    await syncTask(env, (row as { org_id: string }).org_id, (row as { id: string }).id);
  }
}

export { pauseOver, taskSpan };

export interface Offer {
  volunteer: Volunteer;
  task: Task;
}

/**
 * First offers: for each approved person who has never been asked, the open
 * work that fits them best. Short and remote work comes first, so a first ask
 * is easy to say yes to. Nothing is sent until a coordinator approves it.
 */
export async function firstOffers(env: Env, orgId: string, now: number, limit = 20): Promise<Offer[]> {
  const db = env.DB;
  const [{ results }, skips] = await Promise.all([
    db.prepare("SELECT * FROM tasks WHERE org_id = ? AND status = 'open'").bind(orgId).all(),
    db.prepare('SELECT volunteer_id, task_id FROM offer_skips WHERE org_id = ?').bind(orgId).all<{ volunteer_id: string; task_id: string }>(),
  ]);
  const skipped = new Set(skips.results.map((r) => `${r.volunteer_id}:${r.task_id}`));
  const tasks = results.map(toTask).filter((t) => (finishedAt(t) ?? Infinity) > now);
  // Remote work first, then work that asks for a specific skill (so it uses
  // what the person brings), then the shortest.
  const score = (t: Task) => (t.remote ? 0 : 1) * 10000 - Math.min(9, t.requirements.length) * 1000 + Math.min(999, effortOfTask(t) ?? 120);
  tasks.sort((a, b) => score(a) - score(b));
  const picked = new Map<string, Offer>();
  for (const task of tasks) {
    const holding = await holdingCount(db, task.id);
    if (holding >= task.peopleNeeded) continue;
    for (const c of await candidates(env, orgId, task, now)) {
      const v = c.volunteer;
      if (c.reason || v.lastAskedAt !== null || picked.has(v.id) || skipped.has(`${v.id}:${task.id}`)) continue;
      picked.set(v.id, { volunteer: v, task });
    }
  }
  return [...picked.values()].sort((a, b) => a.volunteer.createdAt - b.volunteer.createdAt).slice(0, limit);
}

function effortOfTask(t: Task): number | null {
  if (t.effortMinutes) return t.effortMinutes;
  const span = taskSpan(t);
  return span ? (span.end - span.start) / 60000 : null;
}

/**
 * Splits work at a set time into shorter pieces. People who already said yes
 * keep the original; the open spots move to the new, shorter pieces.
 */
export async function splitTask(env: Env, orgId: string, taskId: string, parts: number, actorId: string, now: number): Promise<string[]> {
  const db = env.DB;
  const task = await loadTask(db, orgId, taskId);
  if (!task) fail(404, 'Not found');
  const span = taskSpan(task);
  if (!span || !['open', 'draft'].includes(task.status)) fail(409, 'Only open work at a set time can be split.');
  if (parts < 2 || parts > 4) fail(400, 'Split into 2 to 4 parts.');
  const holding = await holdingCount(db, task.id);
  const open = task.peopleNeeded - holding;
  if (open < 1) fail(409, 'No open spots to split.');
  const length = Math.floor((span.end - span.start) / parts);
  const row = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(task.id).first<Record<string, unknown>>();
  const ids: string[] = [];
  const statements: D1PreparedStatement[] = [];
  for (let i = 0; i < parts; i++) {
    if (i === 0 && holding === 0) continue;
    const id = newId();
    ids.push(id);
    statements.push(
      db
        .prepare(
          `INSERT INTO tasks (id, org_id, team_id, title, description, contact, timing, starts_at, ends_at, place_public, place_private, people_needed,
            requirements_json, ask_mode, ask_batch, ask_wait_hours, publish, status, created_by, created_at, updated_at, need_id, remote, effort_minutes, bring, files_json)
           VALUES (?, ?, ?, ?, ?, ?, 'at_time', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        )
        .bind(
          id, orgId, row!.team_id, `${task.title} (${i + 1} of ${parts})`, task.description, task.contact, span.start + i * length, span.start + (i + 1) * length,
          task.placePublic, task.placePrivate, open, row!.requirements_json, task.askMode, task.askBatch, task.askWaitHours,
          task.status === 'draft' ? 'draft' : 'open', actorId, now, now, task.needId, task.remote ? 1 : 0, task.bring, row!.files_json,
        ),
    );
  }
  if (holding === 0) {
    statements.push(
      db.prepare('UPDATE tasks SET title = ?, ends_at = ?, updated_at = ? WHERE id = ?').bind(`${task.title} (1 of ${parts})`, span.start + length, now, task.id),
    );
    ids.unshift(task.id);
  } else {
    statements.push(
      db.prepare("UPDATE tasks SET people_needed = ?, status = 'filled', updated_at = ? WHERE id = ?").bind(holding, now, task.id),
      db.prepare("UPDATE asks SET status = 'closed' WHERE task_id = ? AND status = 'waiting'").bind(task.id),
    );
  }
  statements.push(logEvent(db, { orgId, actorKind: 'member', actorId, verb: 'split', objectType: 'task', objectId: task.id, at: now, meta: { into: ids } }));
  await db.batch(statements);
  return ids;
}

/** Active people in an organization who agreed to be contacted. */
export async function activeCount(db: D1Database, orgId: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM volunteers WHERE org_id = ? AND status = 'active' AND contact_ok_at IS NOT NULL")
    .bind(orgId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/**
 * Shares open work with a partner organization: a draft copy goes to the
 * partner, who decides whether to ask their people. Requirements are written
 * against each organization's own fields, so they travel as text.
 */
export async function shareTask(env: Env, orgId: string, taskId: string, partnerOrgId: string, requirementLines: string[], actorId: string, now: number) {
  const db = env.DB;
  const link = await db.prepare('SELECT 1 FROM partners WHERE org_id = ? AND partner_org_id = ?').bind(orgId, partnerOrgId).first();
  if (!link) fail(404, 'Not found');
  const task = await loadTask(db, orgId, taskId);
  const org = await loadOrg(db, orgId);
  if (!task || !org) fail(404, 'Not found');
  const holding = await holdingCount(db, task.id);
  const id = newId();
  const description = [task.description, requirementLines.length ? `Needs: ${requirementLines.join(', ')}` : ''].filter(Boolean).join('\n\n');
  await db.batch([
    db
      .prepare(
        `INSERT INTO tasks (id, org_id, title, description, contact, timing, starts_at, ends_at, due_at, place_public, place_private, people_needed,
          requirements_json, ask_mode, status, created_by, created_at, updated_at, remote, effort_minutes, bring, files_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 'few', 'draft', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id, partnerOrgId, `${task.title} for ${org.name}`, description, task.contact, task.timing, task.startsAt, task.endsAt, task.dueAt,
        task.placePublic, task.placePrivate, Math.max(1, task.peopleNeeded - holding), actorId, now, now, task.remote ? 1 : 0, task.effortMinutes,
        task.bring, JSON.stringify(task.files),
      ),
    logEvent(db, { orgId, actorKind: 'member', actorId, verb: 'shared', objectType: 'task', objectId: task.id, at: now, meta: { partnerOrgId, copy: id } }),
    logEvent(db, { orgId: partnerOrgId, actorKind: 'member', actorId, verb: 'received', objectType: 'task', objectId: id, at: now, meta: { fromOrgId: orgId } }),
  ]);
  return id;
}

/**
 * A volunteer takes open work from their own page. This records an ask and
 * its yes together, through the same rules as any other yes.
 */
export async function takeOpenWork(env: Env, orgId: string, volunteerId: string, taskId: string, now: number): Promise<AnswerResult> {
  const db = env.DB;
  const task = await loadTask(db, orgId, taskId);
  if (!task || task.status !== 'open') fail(404, 'Not found');
  const all = await candidates(env, orgId, task, now);
  const me = all.find((c) => c.volunteer.id === volunteerId);
  if (!me || me.reason) fail(409, "This one isn't open to you.");
  const askId = newId();
  await db.batch([
    db
      .prepare(
        `INSERT INTO asks (id, org_id, task_id, volunteer_id, token_hash, status, created_at, expires_at, link_expires_at, batch_no)
         VALUES (?, ?, ?, ?, ?, 'waiting', ?, ?, ?, 0)`,
      )
      // No link goes with this ask: it was taken on the person's own page.
      .bind(askId, orgId, task.id, volunteerId, `self:${askId}`, now, askExpiry(task, now), now),
    db.prepare('UPDATE volunteers SET last_asked_at = ?, updated_at = ? WHERE id = ? AND org_id = ?').bind(now, now, volunteerId, orgId),
  ]);
  return answerAsk(env, orgId, volunteerId, askId, 'yes', now);
}

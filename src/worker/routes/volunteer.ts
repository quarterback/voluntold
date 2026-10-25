import { Hono, type MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { AppBindings } from '../env';
import { clientIp, rateLimit } from '../auth';
import { loadOrg, logEvent, toTask } from '../db';
import { fail, hashToken, newToken } from '../util';
import { answerAsk, cantMakeIt, sweep } from '../engine';
import { DAY } from '../../shared/rules';

const VOLUNTEER_COOKIE = 'vs';
const SESSION_LIFETIME = 14 * DAY;

/** GET /v/:token. Swaps the link's token for a session and removes it from the address bar. */
export const linkRoute = new Hono<AppBindings>();

linkRoute.get('/:token', async (c) => {
  c.header('referrer-policy', 'no-referrer');
  c.header('cache-control', 'no-store');
  await rateLimit(c, `link:${clientIp(c)}`, 60, 10 * 60 * 1000);
  const token = c.req.param('token');
  const now = c.get('now');
  const ask = token.length >= 20
    ? await c.env.DB.prepare('SELECT id, org_id, volunteer_id, link_expires_at, revoked_at FROM asks WHERE token_hash = ?')
        .bind(await hashToken(c.env, token))
        .first<{ id: string; org_id: string; volunteer_id: string; link_expires_at: number; revoked_at: number | null }>()
    : null;
  if (!ask || ask.revoked_at || ask.link_expires_at <= now) {
    return c.html(
      page('This link no longer works', '<p>It may have expired or been replaced by a newer link. Ask the organization to send you a new one.</p>'),
      410,
    );
  }
  const session = newToken();
  await c.env.DB.prepare('INSERT INTO volunteer_sessions (id_hash, org_id, volunteer_id, ask_id, expires_at) VALUES (?, ?, ?, ?, ?)')
    .bind(await hashToken(c.env, session), ask.org_id, ask.volunteer_id, ask.id, Math.min(now + SESSION_LIFETIME, ask.link_expires_at))
    .run();
  setCookie(c, VOLUNTEER_COOKIE, session, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: SESSION_LIFETIME / 1000 });
  return c.redirect(`/me?ask=${ask.id}`, 302);
});

export function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer"><title>${escapeHtml(title)}</title>
<style>body{font-family:Roboto,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px 16px;line-height:1.5;color:#191c1c;background:#f4fbf9}
h1{font-size:1.5rem;font-weight:500}a{color:#006a62}.meta{color:#3f4947}@media (prefers-color-scheme:dark){body{background:#0e1514;color:#dde4e2}a{color:#53dbc9}.meta{color:#bec9c6}}</style>
</head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}

const requireVolunteer: MiddlewareHandler<AppBindings> = async (c, next) => {
  const token = getCookie(c, VOLUNTEER_COOKIE);
  if (!token) fail(401, 'Open the link you were sent.');
  const row = await c.env.DB.prepare(
    `SELECT s.org_id, s.volunteer_id, s.ask_id, s.expires_at, a.revoked_at FROM volunteer_sessions s
     JOIN asks a ON a.id = s.ask_id WHERE s.id_hash = ?`,
  )
    .bind(await hashToken(c.env, token))
    .first<{ org_id: string; volunteer_id: string; ask_id: string; expires_at: number; revoked_at: number | null }>();
  if (!row || row.expires_at <= c.get('now') || row.revoked_at) fail(401, 'Open the link you were sent.');
  c.set('volunteer', { orgId: row.org_id, volunteerId: row.volunteer_id, askId: row.ask_id });
  await next();
};

/** /api/v: everything the volunteer's own page needs, scoped to that one person. */
export const volunteerApi = new Hono<AppBindings>();
volunteerApi.use('*', requireVolunteer);

function taskForVolunteer(r: Record<string, unknown>) {
  const t = toTask(r);
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    contact: t.contact,
    timing: t.timing,
    startsAt: t.startsAt,
    endsAt: t.endsAt,
    dueAt: t.dueAt,
    placePublic: t.placePublic,
    placePrivate: t.placePrivate,
    status: t.status,
  };
}

volunteerApi.get('/me', async (c) => {
  const { orgId, volunteerId } = c.get('volunteer');
  const now = c.get('now');
  const db = c.env.DB;
  await sweep(c.env, now, orgId);
  const [org, v, asks, spots] = await Promise.all([
    loadOrg(db, orgId),
    db.prepare('SELECT name, status, paused_until, paused_reason FROM volunteers WHERE id = ? AND org_id = ?').bind(volunteerId, orgId).first<Record<string, string | number | null>>(),
    db
      .prepare(
        `SELECT a.id AS ask_id, a.status AS ask_status, a.expires_at, t.* FROM asks a JOIN tasks t ON t.id = a.task_id
         WHERE a.org_id = ? AND a.volunteer_id = ? AND a.revoked_at IS NULL ORDER BY a.created_at DESC LIMIT 20`,
      )
      .bind(orgId, volunteerId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        `SELECT s.id AS spot_id, s.status AS spot_status, t.* FROM spots s JOIN tasks t ON t.id = s.task_id
         WHERE s.org_id = ? AND s.volunteer_id = ? ORDER BY COALESCE(t.starts_at, t.due_at, s.created_at) DESC LIMIT 50`,
      )
      .bind(orgId, volunteerId)
      .all<Record<string, unknown>>(),
  ]);
  if (!org || !v) fail(404, 'Not found');
  const holdingTaskIds = new Set(spots.results.filter((s) => s.spot_status === 'holding').map((s) => s.id));
  return c.json({
    org: { name: org.name, timeZone: org.time_zone },
    volunteer: { name: v.name, status: v.status, pausedUntil: v.paused_until, pausedReason: v.paused_reason },
    asks: asks.results.map((a) => ({
      id: a.ask_id,
      status: a.ask_status,
      expiresAt: a.expires_at,
      holding: holdingTaskIds.has(a.id),
      task: taskForVolunteer(a),
    })),
    upcoming: spots.results.filter((s) => s.spot_status === 'holding').map((s) => ({ id: s.spot_id, task: taskForVolunteer(s) })),
    past: spots.results.filter((s) => s.spot_status === 'done' || s.spot_status === 'missed').map((s) => ({ id: s.spot_id, status: s.spot_status, task: taskForVolunteer(s) })),
  });
});

volunteerApi.post('/asks/:askId/answer', async (c) => {
  const { orgId, volunteerId } = c.get('volunteer');
  const body = await c.req.json().catch(() => ({}));
  if (body.answer !== 'yes' && body.answer !== 'no') fail(400, 'Answer yes or no.');
  const result = await answerAsk(c.env, orgId, volunteerId, c.req.param('askId'), body.answer, c.get('now'));
  return c.json({ result });
});

volunteerApi.post('/spots/:spotId/cant', async (c) => {
  const { orgId, volunteerId } = c.get('volunteer');
  await cantMakeIt(c.env, orgId, volunteerId, c.req.param('spotId'), c.get('now'));
  return c.json({ ok: true });
});

volunteerApi.post('/pause', async (c) => {
  const { orgId, volunteerId } = c.get('volunteer');
  const body = await c.req.json().catch(() => ({}));
  const until = Date.parse(String(body.until ?? ''));
  const now = c.get('now');
  if (Number.isNaN(until) || until <= now) fail(400, 'Choose a date in the future.');
  if (until - now > 366 * DAY) fail(400, 'Choose a date within the next year.');
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE volunteers SET status = 'paused', paused_until = ?, paused_reason = 'volunteer', unanswered_streak = 0, updated_at = ? WHERE id = ? AND org_id = ? AND status != 'stopped'",
    ).bind(until, now, volunteerId, orgId),
    logEvent(c.env.DB, { orgId, actorKind: 'volunteer', actorId: volunteerId, verb: 'paused', objectType: 'volunteer', objectId: volunteerId, at: now }),
  ]);
  return c.json({ ok: true });
});

volunteerApi.post('/resume', async (c) => {
  const { orgId, volunteerId } = c.get('volunteer');
  const now = c.get('now');
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE volunteers SET status = 'active', paused_until = NULL, paused_reason = NULL, unanswered_streak = 0, updated_at = ? WHERE id = ? AND org_id = ?",
    ).bind(now, volunteerId, orgId),
    logEvent(c.env.DB, { orgId, actorKind: 'volunteer', actorId: volunteerId, verb: 'resumed', objectType: 'volunteer', objectId: volunteerId, at: now }),
  ]);
  return c.json({ ok: true });
});

volunteerApi.post('/stop', async (c) => {
  const { orgId, volunteerId } = c.get('volunteer');
  const now = c.get('now');
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE volunteers SET status = 'stopped', updated_at = ? WHERE id = ? AND org_id = ?").bind(now, volunteerId, orgId),
    c.env.DB.prepare("UPDATE asks SET status = 'closed' WHERE volunteer_id = ? AND org_id = ? AND status = 'waiting'").bind(volunteerId, orgId),
    logEvent(c.env.DB, { orgId, actorKind: 'volunteer', actorId: volunteerId, verb: 'stopped', objectType: 'volunteer', objectId: volunteerId, at: now }),
  ]);
  return c.json({ ok: true });
});

import { Hono, type MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { AppBindings } from '../env';
import { clientIp, rateLimit } from '../auth';
import { loadOrg, loadVolunteer, logEvent, toTask } from '../db';
import { readAvailability } from './people';
import { cleanText, fail, hashToken, newId, newToken } from '../util';
import { answerAsk, candidates, cantMakeIt, sweep, takeOpenWork } from '../engine';
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
      page('Link expired', ''),
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

/** Link tags for a page that may be shared. Private pages pass none. */
export interface PageMeta {
  description: string;
  url: string;
  image: string;
}

export function page(title: string, body: string, meta?: PageMeta): string {
  const tags = meta
    ? `<meta name="description" content="${escapeHtml(meta.description)}">
<meta property="og:site_name" content="Volley"><meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(meta.description)}">
<meta property="og:url" content="${escapeHtml(meta.url)}"><meta property="og:image" content="${escapeHtml(meta.image)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(meta.description)}"><meta name="twitter:image" content="${escapeHtml(meta.image)}">`
    : '<meta name="robots" content="noindex">';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer"><title>${escapeHtml(title)}</title>${tags}
<style>
@font-face{font-family:"Object Sans";src:url(/fonts/PPObjectSans-Heavy.woff2) format("woff2");font-weight:800;font-display:swap}
@font-face{font-family:"Neue Montreal";src:url(/fonts/PPNeueMontreal-Book.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Neue Montreal";src:url(/fonts/PPNeueMontreal-Semibold.woff2) format("woff2");font-weight:600;font-display:swap}
:root{--bg:#F1EEFF;--surface:#fff;--ink:#14112B;--text:#14112B;--text2:#4A4668;--accent:#3D3BF3;--lime:#C6F432;--soft:#E4E3FE}
@media (prefers-color-scheme:dark){:root{--bg:#0D0B1C;--surface:#17142C;--text:#F2F0FF;--text2:#B6B1D6;--accent:#8F8DFF;--soft:#23215A}}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 "Neue Montreal",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:520px;margin:0 auto;padding:32px 16px}
.card{background:var(--surface);border-radius:20px;padding:28px 24px}
h1{font-family:"Object Sans",system-ui,sans-serif;font-weight:800;font-size:2rem;line-height:1.05;letter-spacing:-.025em;margin:0 0 16px}
.meta{color:var(--text2);font-size:.9375rem;margin:0 0 4px}
.row{margin:6px 0}.row b{font-weight:600}
.status{display:inline-block;background:var(--lime);color:var(--ink);border-radius:999px;padding:4px 12px;font-size:.875rem;font-weight:600;margin:12px 0}
ul{padding-left:20px;margin:4px 0}a{color:var(--accent);font-weight:600}
.foot{color:var(--text2);font-size:.9375rem;margin-top:16px}
</style></head><body><main><div class="card"><h1>${escapeHtml(title)}</h1>${body}</div></main></body></html>`;
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
    remote: t.remote,
    effortMinutes: t.effortMinutes,
    bring: t.bring,
    files: t.files,
  };
}

volunteerApi.get('/me', async (c) => {
  const { orgId, volunteerId } = c.get('volunteer');
  const now = c.get('now');
  const db = c.env.DB;
  await sweep(c.env, now, orgId);
  const [org, v, asks, spots] = await Promise.all([
    loadOrg(db, orgId),
    db.prepare('SELECT * FROM volunteers WHERE id = ? AND org_id = ?').bind(volunteerId, orgId).first<Record<string, any>>(),
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
  // Open work this person fits and hasn't been asked about, shortest first.
  const { results: openRows } = await db.prepare("SELECT * FROM tasks WHERE org_id = ? AND status = 'open'").bind(orgId).all();
  const openForYou: ReturnType<typeof taskForVolunteer>[] = [];
  if (v.status === 'active') {
    for (const row of openRows) {
      const task = toTask(row);
      const fit = (await candidates(c.env, orgId, task, now)).find((x) => x.volunteer.id === volunteerId);
      if (fit && fit.reason === null) openForYou.push(taskForVolunteer(row));
    }
  }
  openForYou.sort((a, b) => (a.remote === b.remote ? (a.effortMinutes ?? 120) - (b.effortMinutes ?? 120) : a.remote ? -1 : 1));
  const holdingTaskIds = new Set(spots.results.filter((s) => s.spot_status === 'holding').map((s) => s.id));
  return c.json({
    org: { name: org.name, timeZone: org.time_zone },
    volunteer: {
      name: v.name, status: v.status, pausedUntil: v.paused_until, pausedReason: v.paused_reason,
      hoursWeek: v.hours_week, days: JSON.parse(v.days_json || '[]'), remoteOk: v.remote_ok === 1, tier: v.tier,
    },
    openForYou: openForYou.slice(0, 5),
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
  if (body.answer !== 'yes' && body.answer !== 'no') fail(400, 'Accept or decline.');
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

volunteerApi.post('/tasks/:taskId/take', async (c) => {
  const { orgId, volunteerId } = c.get('volunteer');
  const result = await takeOpenWork(c.env, orgId, volunteerId, c.req.param('taskId'), c.get('now'));
  return c.json({ result });
});

/** The person's own availability: hours this week, usual times, remote. */
volunteerApi.post('/availability', async (c) => {
  const { orgId, volunteerId } = c.get('volunteer');
  const body = await c.req.json().catch(() => ({}));
  const v = await loadVolunteer(c.env.DB, orgId, volunteerId);
  if (!v) fail(404, 'Not found');
  const a = readAvailability(body, v);
  const now = c.get('now');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE volunteers SET hours_week = ?, days_json = ?, remote_ok = ?, updated_at = ? WHERE id = ? AND org_id = ?').bind(
      a.hoursWeek, JSON.stringify(a.days), a.remoteOk ? 1 : 0, now, volunteerId, orgId,
    ),
    logEvent(c.env.DB, { orgId, actorKind: 'volunteer', actorId: volunteerId, verb: 'availability', objectType: 'volunteer', objectId: volunteerId, at: now }),
  ]);
  return c.json({ ok: true });
});

/** Something is stopping the work: the coordinator sees it on Today. */
volunteerApi.post('/spots/:spotId/report', async (c) => {
  const { orgId, volunteerId } = c.get('volunteer');
  const body = await c.req.json().catch(() => ({}));
  const text = cleanText(body.body, 1000);
  if (!text) fail(400, 'Describe the problem.');
  const spot = await c.env.DB.prepare('SELECT task_id FROM spots WHERE id = ? AND org_id = ? AND volunteer_id = ?').bind(c.req.param('spotId'), orgId, volunteerId).first<{ task_id: string }>();
  if (!spot) fail(404, 'Not found');
  const id = newId();
  const now = c.get('now');
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO reports (id, org_id, spot_id, task_id, volunteer_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, orgId, c.req.param('spotId'), spot.task_id, volunteerId, text, now),
    logEvent(c.env.DB, { orgId, actorKind: 'volunteer', actorId: volunteerId, verb: 'reported', objectType: 'spot', objectId: c.req.param('spotId'), at: now }),
  ]);
  return c.json({ ok: true });
});

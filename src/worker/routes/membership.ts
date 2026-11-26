// Public pages for membership, and the coordinator routes behind them:
// - /u/:token: unsubscribe from a link in a renewal reminder or a group email
// - /join/:orgId: the public application form, when the organization opens it
// - applications and group email, for coordinators

import { Hono } from 'hono';
import type { AppBindings, Env } from '../env';
import { clientIp, must, rateLimit } from '../auth';
import { loadOrg, logEvent } from '../db';
import { cleanText, fail, hashToken, newId, normalizeEmail, normalizePhone, optionalText } from '../util';
import { escapeHtml, page } from './volunteer';
import { deliver, memberEmail, type Outgoing } from '../mail';

// Unsubscribe links carry the person's id and a signature, so they need no stored token.

export async function unsubscribeLink(env: Env, volunteerId: string): Promise<string> {
  const sig = (await hashToken(env, `unsubscribe:${volunteerId}`)).slice(0, 24);
  return `${env.APP_URL}/u/${volunteerId}.${sig}`;
}

async function volunteerFromToken(env: Env, token: string): Promise<{ id: string; org_id: string; status: string } | null> {
  const [id, sig] = token.split('.');
  if (!id || !sig || (await hashToken(env, `unsubscribe:${id}`)).slice(0, 24) !== sig) return null;
  return env.DB.prepare('SELECT id, org_id, status FROM volunteers WHERE id = ?').bind(id).first();
}

export const unsubscribeRoute = new Hono<AppBindings>();

// The page asks first, so a mail scanner that opens links doesn't unsubscribe anyone.
unsubscribeRoute.get('/:token', async (c) => {
  c.header('referrer-policy', 'no-referrer');
  const v = await volunteerFromToken(c.env, c.req.param('token'));
  if (!v) return c.html(page('Link not found', ''), 404);
  const org = await loadOrg(c.env.DB, v.org_id);
  if (v.status === 'stopped') return c.html(page("You're unsubscribed", `<p>${escapeHtml(String(org?.name ?? ''))} won't email you.</p>`));
  return c.html(page(`Stop emails from ${String(org?.name ?? 'this organization')}?`,
    `<form method="post"><button type="submit" style="font:inherit;font-weight:600;padding:12px 20px;border-radius:999px;border:0;background:var(--accent);color:#fff">Unsubscribe</button></form>`));
});

unsubscribeRoute.post('/:token', async (c) => {
  await rateLimit(c, `unsub:${clientIp(c)}`, 30, 10 * 60 * 1000);
  const v = await volunteerFromToken(c.env, c.req.param('token'));
  if (!v) return c.html(page('Link not found', ''), 404);
  const now = c.get('now');
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE volunteers SET status = 'stopped', updated_at = ? WHERE id = ?").bind(now, v.id),
    logEvent(c.env.DB, { orgId: v.org_id, actorKind: 'volunteer', actorId: v.id, verb: 'stopped', objectType: 'volunteer', objectId: v.id, at: now }),
  ]);
  const org = await loadOrg(c.env.DB, v.org_id);
  return c.html(page("You're unsubscribed", `<p>${escapeHtml(String(org?.name ?? ''))} won't email you.</p>`));
});

// The application form.

export const joinRoute = new Hono<AppBindings>();

async function openOrg(env: Env, orgId: string) {
  const org = await loadOrg(env.DB, orgId);
  return org && org.join_open === 1 && org.approved_at && org.sample !== 1 ? org : null;
}

function joinForm(org: Record<string, unknown>, error = ''): string {
  const categories: string[] = JSON.parse(String(org.member_categories_json || '[]'));
  const input = 'display:block;width:100%;box-sizing:border-box;font:inherit;padding:10px 12px;border-radius:10px;border:1.5px solid #CFCBE6;margin:4px 0 14px';
  return `${error ? `<p style="color:#B42318;font-weight:600">${escapeHtml(error)}</p>` : ''}
<form method="post">
<label>Name<input name="name" required maxlength="200" autocomplete="name" style="${input}"></label>
<label>Email<input name="email" type="email" required maxlength="320" autocomplete="email" style="${input}"></label>
<label>Phone<input name="phone" maxlength="40" autocomplete="tel" style="${input}"></label>
${categories.length ? `<label>Category<select name="category" style="${input}"><option value="">Choose one</option>${categories.map((c) => `<option>${escapeHtml(c)}</option>`).join('')}</select></label>` : ''}
<label>Anything we should know<textarea name="note" rows="3" maxlength="1000" style="${input}"></textarea></label>
<input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
<label style="display:flex;gap:8px;margin:4px 0"><input type="checkbox" name="adult" required> I'm 18 or older</label>
<label style="display:flex;gap:8px;margin:4px 0 16px"><input type="checkbox" name="consent" required> ${escapeHtml(String(org.name))} can contact me by email</label>
<button type="submit" style="font:inherit;font-weight:600;padding:12px 20px;border-radius:999px;border:0;background:var(--accent);color:#fff">Apply</button>
</form>`;
}

joinRoute.get('/:orgId', async (c) => {
  const org = await openOrg(c.env, c.req.param('orgId'));
  if (!org) return c.html(page('Applications are closed', ''), 404);
  return c.html(page(`Join ${String(org.name)}`, joinForm(org)));
});

joinRoute.post('/:orgId', async (c) => {
  const org = await openOrg(c.env, c.req.param('orgId'));
  if (!org) return c.html(page('Applications are closed', ''), 404);
  await rateLimit(c, `join:${clientIp(c)}`, 10, 60 * 60 * 1000);
  const form = await c.req.parseBody();
  // Bots fill the hidden field. Tell them it worked and keep nothing.
  if (cleanText(form.website, 200)) return c.html(page('Thanks for applying', ''));
  const name = cleanText(form.name, 200);
  const email = normalizeEmail(form.email);
  const phone = form.phone ? normalizePhone(form.phone) : null;
  if (!name || !email || !form.adult || !form.consent) {
    return c.html(page(`Join ${String(org.name)}`, joinForm(org, 'Enter your name and email, and check both boxes.')), 400);
  }
  const categories: string[] = JSON.parse(String(org.member_categories_json || '[]'));
  const category = categories.includes(String(form.category ?? '')) ? String(form.category) : null;
  const now = c.get('now');
  const pending = await c.env.DB.prepare("SELECT 1 FROM applications WHERE org_id = ? AND email = ? AND status = 'pending'").bind(org.id, email).first();
  if (!pending) {
    await c.env.DB.prepare('INSERT INTO applications (id, org_id, name, email, phone, category, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(newId(), org.id, name, email, phone, category, cleanText(form.note, 1000), now)
      .run();
  }
  return c.html(page('Thanks for applying', `<p>${escapeHtml(String(org.name))} will be in touch.</p>`));
});

// Coordinator routes, under /api/orgs/:orgId.

export const membershipRoutes = new Hono<AppBindings>();

membershipRoutes.get('/applications', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM applications WHERE org_id = ? AND status = 'pending' ORDER BY created_at")
    .bind(c.get('actor').orgId)
    .all();
  return c.json({ applications: results.map((a) => ({ id: a.id, name: a.name, email: a.email, phone: a.phone, category: a.category, note: a.note, createdAt: a.created_at })) });
});

/** Accepting adds the person to the roster. They agreed to be contacted on the form. */
membershipRoutes.post('/applications/:id/accept', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const a = await c.env.DB.prepare("SELECT * FROM applications WHERE id = ? AND org_id = ? AND status = 'pending'")
    .bind(c.req.param('id'), actor.orgId)
    .first<{ id: string; name: string; email: string; phone: string | null; category: string | null; created_at: number }>();
  if (!a) fail(404, 'Not found');
  const now = c.get('now');
  const id = newId();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO volunteers (id, org_id, name, email, phone, contact_ok_at, values_json, created_at, updated_at, member_category, member_since)
       VALUES (?, ?, ?, ?, ?, ?, '{}', ?, ?, ?, ?)`,
    ).bind(id, actor.orgId, a.name, a.email, a.phone, a.created_at, now, now, a.category, now),
    c.env.DB.prepare("UPDATE applications SET status = 'accepted', volunteer_id = ?, decided_at = ? WHERE id = ?").bind(id, now, a.id),
    logEvent(c.env.DB, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'accepted_application', objectType: 'volunteer', objectId: id, at: now }),
  ]);
  return c.json({ id });
});

membershipRoutes.post('/applications/:id/decline', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const res = await c.env.DB.prepare("UPDATE applications SET status = 'declined', decided_at = ? WHERE id = ? AND org_id = ? AND status = 'pending'")
    .bind(c.get('now'), c.req.param('id'), actor.orgId)
    .run();
  if (res.meta.changes !== 1) fail(404, 'Not found');
  return c.json({ ok: true });
});

/**
 * Email to a group. The coordinator picks the people on the People screen.
 * Only people who agreed to be contacted, haven't unsubscribed and have an
 * email address get it.
 */
membershipRoutes.post('/messages', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const body = await c.req.json().catch(() => ({}));
  const subject = cleanText(body.subject, 200);
  const text = optionalText(body.body, 10000);
  if (!subject || !text) fail(400, 'Write a subject and a message.');
  const ids: string[] = Array.isArray(body.volunteerIds) ? [...new Set(body.volunteerIds.filter((x: unknown) => typeof x === 'string'))].slice(0, 5000) as string[] : [];
  if (ids.length === 0) fail(400, 'Choose at least one person.');
  const db = c.env.DB;
  const org = (await loadOrg(db, actor.orgId))!;
  const people: { id: string; email: string }[] = [];
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    const { results } = await db
      .prepare(
        `SELECT id, email FROM volunteers WHERE org_id = ? AND id IN (${chunk.map(() => '?').join(',')})
         AND status != 'stopped' AND contact_ok_at IS NOT NULL AND email IS NOT NULL`,
      )
      .bind(actor.orgId, ...chunk)
      .all<{ id: string; email: string }>();
    people.push(...results);
  }
  const now = c.get('now');
  const messageId = newId();
  const replyTo = await memberEmail(db, actor.memberId);
  const mails: Outgoing[] = [];
  for (const p of people) {
    mails.push({
      kind: 'message', to: p.email, subject, replyTo, volunteerId: p.id, memberId: actor.memberId, messageId,
      text: [text, '', '--', `${String(org.name)} sent this to people on its list.`, `Unsubscribe: ${await unsubscribeLink(c.env, p.id)}`].join('\n'),
    });
  }
  const statuses = await deliver(c.env, actor.orgId, mails, now);
  const sent = statuses.filter((s) => s === 'sent').length;
  await db.prepare('INSERT INTO messages (id, org_id, member_id, subject, body, recipients, sent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(messageId, actor.orgId, actor.memberId, subject, text, people.length, sent, now)
    .run();
  return c.json({ recipients: people.length, sent, skipped: ids.length - people.length, notSent: statuses.filter((s) => s !== 'sent').length, reason: statuses.find((s) => s !== 'sent') ?? null });
});

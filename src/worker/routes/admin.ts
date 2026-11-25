// Approving new organizations. Until an admin of the tool approves an
// organization, it can set up, import and write tasks, but the tool sends no
// email for it. Admins are the addresses in ADMIN_EMAILS.

import { Hono } from 'hono';
import type { AppBindings, Env } from '../env';
import { fail, normalizeEmail } from '../util';
import { mailEnabled, sendEmail } from '../mail';

export function isAdmin(env: Env, email: string | undefined): boolean {
  const me = normalizeEmail(email);
  return !!me && adminList(env).includes(me);
}

function adminList(env: Env): string[] {
  return (env.ADMIN_EMAILS ?? '').split(',').map((e) => normalizeEmail(e)).filter((e): e is string => !!e);
}

/** Emails the admins when a new organization signs up. A failed email doesn't stop the sign-up. */
export async function tellAdmins(env: Env, orgName: string, byEmail: string): Promise<void> {
  const admins = adminList(env);
  if (admins.length === 0 || !mailEnabled(env)) return;
  const text = [`${orgName} signed up.`, `Created by ${byEmail}.`, '', `Review it: ${env.APP_URL}/admin`].join('\n');
  for (const to of admins) {
    await sendEmail(env, { from: env.EMAIL_FROM!, to, subject: `New organization: ${orgName}`, text });
  }
}

export const adminRoutes = new Hono<AppBindings>();

adminRoutes.use('*', async (c, next) => {
  if (!isAdmin(c.env, c.get('email'))) fail(404, 'Not found');
  await next();
});

/** Organizations that aren't samples, newest first, with who made them and how big they are. */
adminRoutes.get('/orgs', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT o.id, o.name, o.created_at, o.approved_at, o.email_daily_limit,
       (SELECT u.email FROM members m JOIN users u ON u.id = m.user_id WHERE m.org_id = o.id ORDER BY m.created_at LIMIT 1) AS creator,
       (SELECT COUNT(*) FROM volunteers v WHERE v.org_id = o.id) AS people,
       (SELECT COUNT(*) FROM tasks t WHERE t.org_id = o.id) AS tasks
     FROM orgs o WHERE COALESCE(o.sample, 0) = 0
     ORDER BY o.approved_at IS NOT NULL, o.created_at DESC LIMIT 200`,
  ).all<Record<string, unknown>>();
  return c.json({
    orgs: results.map((r) => ({
      id: r.id, name: r.name, createdAt: r.created_at, approved: r.approved_at !== null, emailDailyLimit: r.email_daily_limit,
      creator: r.creator, people: r.people, tasks: r.tasks,
    })),
  });
});

adminRoutes.post('/orgs/:orgId/approve', async (c) => {
  const res = await c.env.DB.prepare('UPDATE orgs SET approved_at = COALESCE(approved_at, ?) WHERE id = ?').bind(c.get('now'), c.req.param('orgId')).run();
  if (res.meta.changes !== 1) fail(404, 'Not found');
  return c.json({ ok: true });
});

adminRoutes.post('/orgs/:orgId/revoke', async (c) => {
  const res = await c.env.DB.prepare('UPDATE orgs SET approved_at = NULL WHERE id = ?').bind(c.req.param('orgId')).run();
  if (res.meta.changes !== 1) fail(404, 'Not found');
  return c.json({ ok: true });
});

adminRoutes.post('/orgs/:orgId/limit', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const limit = Number(body.emailDailyLimit);
  if (!Number.isInteger(limit) || limit < 0 || limit > 100000) fail(400, 'Enter a whole number from 0 to 100,000.');
  const res = await c.env.DB.prepare('UPDATE orgs SET email_daily_limit = ? WHERE id = ?').bind(limit, c.req.param('orgId')).run();
  if (res.meta.changes !== 1) fail(404, 'Not found');
  return c.json({ ok: true });
});

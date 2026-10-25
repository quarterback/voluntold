import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Actor, AppBindings, Env } from './env';
import { fail, hashToken, isDev, newId, newToken, normalizeEmail } from './util';
import { DAY } from '../shared/rules';

const SESSION_COOKIE = 'sid';
const SESSION_LIFETIME = 30 * DAY;
const CODE_LIFETIME = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

/** Test clock: in dev mode only, a request can say what time it is. */
export const clock: MiddlewareHandler<AppBindings> = async (c, next) => {
  const header = c.req.header('x-test-now');
  c.set('now', isDev(c.env) && header ? Number(header) : Date.now());
  await next();
};

/**
 * Changes must carry a custom header. Browsers can't add one to a cross-site
 * form post without a CORS preflight, and no CORS is allowed.
 */
export const csrf: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && c.req.header('x-requested-with') !== 'voluntold') {
    fail(403, 'Missing request header');
  }
  await next();
};

/** Fixed window rate limit kept in D1. Good enough for a pilot. */
export async function rateLimit(c: Context<AppBindings>, key: string, limit: number, windowMs: number) {
  const now = c.get('now');
  const row = await c.env.DB.prepare('SELECT count, window_start FROM rate_limits WHERE key = ?').bind(key).first<{
    count: number;
    window_start: number;
  }>();
  if (!row || now - row.window_start > windowMs) {
    await c.env.DB.prepare('INSERT OR REPLACE INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)').bind(key, now).run();
    return;
  }
  if (row.count >= limit) fail(429, 'Too many requests. Try again in a few minutes.');
  await c.env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
}

export function clientIp(c: Context<AppBindings>): string {
  return c.req.header('cf-connecting-ip') ?? 'local';
}

async function sendCode(env: Env, email: string, code: string): Promise<'sent' | 'dev'> {
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: email,
        subject: `Your sign-in code: ${code}`,
        text: `Your sign-in code is ${code}. It works for 10 minutes.`,
      }),
    });
    if (!res.ok) fail(503, 'Could not send the sign-in email. Try again.');
    return 'sent';
  }
  if (isDev(env)) return 'dev';
  fail(503, 'Sign-in email is not set up on this server.');
}

export async function startLogin(c: Context<AppBindings>, rawEmail: unknown) {
  const email = normalizeEmail(rawEmail);
  if (!email) fail(400, 'Enter a valid email address.');
  await rateLimit(c, `login:ip:${clientIp(c)}`, 20, 15 * 60 * 1000);
  await rateLimit(c, `login:email:${email}`, 5, 15 * 60 * 1000);
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
  await c.env.DB.prepare(
    'INSERT OR REPLACE INTO login_codes (email, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0)',
  )
    .bind(email, await hashToken(c.env, `code:${email}:${code}`), c.get('now') + CODE_LIFETIME)
    .run();
  const how = await sendCode(c.env, email, code);
  return how === 'dev' ? { sent: false, devCode: code } : { sent: true };
}

export async function finishLogin(c: Context<AppBindings>, rawEmail: unknown, rawCode: unknown) {
  const email = normalizeEmail(rawEmail);
  const code = typeof rawCode === 'string' ? rawCode.trim() : '';
  if (!email || !/^\d{6}$/.test(code)) fail(400, 'Enter the 6 digit code.');
  const row = await c.env.DB.prepare('SELECT * FROM login_codes WHERE email = ?').bind(email).first<{
    code_hash: string;
    expires_at: number;
    attempts: number;
  }>();
  const now = c.get('now');
  if (!row || row.expires_at < now || row.attempts >= MAX_CODE_ATTEMPTS) fail(401, 'That code has expired. Ask for a new one.');
  if (row.code_hash !== (await hashToken(c.env, `code:${email}:${code}`))) {
    await c.env.DB.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?').bind(email).run();
    fail(401, 'That code is not right.');
  }
  await c.env.DB.prepare('DELETE FROM login_codes WHERE email = ?').bind(email).run();

  let user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
  if (!user) {
    user = { id: newId() };
    await c.env.DB.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)').bind(user.id, email, now).run();
  }
  const token = newToken();
  await c.env.DB.prepare('INSERT INTO sessions (id_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await hashToken(c.env, token), user.id, now + SESSION_LIFETIME)
    .run();
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_LIFETIME / 1000,
  });
  return { userId: user.id, email };
}

export async function logout(c: Context<AppBindings>) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(await hashToken(c.env, token)).run();
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export const requireUser: MiddlewareHandler<AppBindings> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) fail(401, 'Sign in first.');
  const row = await c.env.DB.prepare(
    'SELECT u.id, u.email, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = ?',
  )
    .bind(await hashToken(c.env, token))
    .first<{ id: string; email: string; expires_at: number }>();
  if (!row || row.expires_at < c.get('now')) fail(401, 'Sign in first.');
  c.set('userId', row.id);
  c.set('email', row.email);
  await next();
};

/** Loads the signed-in user's membership in the organization named in the URL. */
export const requireMember: MiddlewareHandler<AppBindings> = async (c, next) => {
  const orgId = c.req.param('orgId');
  if (!orgId) fail(404, 'Not found');
  const member = await c.env.DB.prepare('SELECT id, role FROM members WHERE org_id = ? AND user_id = ?')
    .bind(orgId, c.get('userId'))
    .first<{ id: string; role: Actor['role'] }>();
  // Same answer for "no such organization" and "not yours", so ids can't be probed.
  if (!member) fail(404, 'Not found');
  const { results } = await c.env.DB.prepare('SELECT team_id FROM team_leads WHERE org_id = ? AND member_id = ?')
    .bind(orgId, member.id)
    .all<{ team_id: string }>();
  c.set('actor', {
    userId: c.get('userId'),
    email: c.get('email'),
    memberId: member.id,
    orgId,
    role: member.role,
    leadTeamIds: results.map((r) => r.team_id),
  });
  await next();
};

export type Permission = 'manage_org' | 'manage_people' | 'export';

export function must(actor: Actor, permission: Permission) {
  const ok =
    actor.role === 'admin' || (actor.role === 'coordinator' && permission === 'manage_people');
  if (!ok) fail(403, 'You do not have permission to do that.');
}

/** Admins and coordinators manage every task. Team leads manage their own team's tasks. */
export function mustManageTask(actor: Actor, teamId: string | null) {
  if (actor.role === 'admin' || actor.role === 'coordinator') return;
  if (actor.role === 'lead' && teamId && actor.leadTeamIds.includes(teamId)) return;
  fail(403, 'You do not have permission to do that.');
}

/** Admins and coordinators manage every team. A lead manages their own team's members. */
export function mustManageTeam(actor: Actor, teamId: string) {
  if (actor.role === 'admin' || actor.role === 'coordinator') return;
  if (actor.leadTeamIds.includes(teamId)) return;
  fail(403, 'You do not have permission to do that.');
}

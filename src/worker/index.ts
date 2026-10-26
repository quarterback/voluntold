import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppBindings, Env } from './env';
import { clock, csrf, finishLogin, logout, requireMember, requireUser, startLogin } from './auth';
import { accountRoutes, orgRoutes } from './routes/org';
import { peopleRoutes } from './routes/people';
import { taskRoutes } from './routes/tasks';
import { needRoutes } from './routes/needs';
import { linkRoute, volunteerApi } from './routes/volunteer';
import { publicRoutes } from './routes/public';
import { sweep } from './engine';
import { createSampleOrg } from './sample';
import { fail, isDev } from './util';

const app = new Hono<AppBindings>();

app.use('*', clock);
app.use('*', async (c, next) => {
  await next();
  c.header('x-content-type-options', 'nosniff');
  c.header('x-frame-options', 'DENY');
  if (c.req.path.startsWith('/api/')) c.header('cache-control', 'no-store');
});
app.use('/api/*', csrf);

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  // Never log request URLs here: they can hold a private link's token.
  console.error('unhandled', err instanceof Error ? err.message : err);
  return c.json({ error: 'Something went wrong. Try again.' }, 500);
});

app.post('/api/auth/start', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json(await startLogin(c, body.email));
});
app.post('/api/auth/verify', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json(await finishLogin(c, body.email, body.code));
});
app.post('/api/auth/logout', async (c) => {
  await logout(c);
  return c.json({ ok: true });
});

const signedIn = new Hono<AppBindings>();
signedIn.use('*', requireUser);
signedIn.route('/', accountRoutes);
signedIn.post('/dev/sample', async (c) => {
  if (!isDev(c.env)) fail(404, 'Not found');
  return c.json({ id: await createSampleOrg(c.env, c.get('userId'), c.get('now')) }, 201);
});
const org = new Hono<AppBindings>();
org.use('*', requireMember);
org.route('/', orgRoutes);
org.route('/', peopleRoutes);
org.route('/', taskRoutes);
org.route('/', needRoutes);
signedIn.route('/orgs/:orgId', org);

// The volunteer API comes first: the signed-in routes below match all of /api.
app.route('/api/v', volunteerApi);
app.route('/api', signedIn);
app.route('/v', linkRoute);
app.route('/t', publicRoutes);

app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(sweep(env, Date.now()));
  },
} satisfies ExportedHandler<Env>;

export { app };

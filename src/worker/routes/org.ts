import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { must, mustManageTeam } from '../auth';
import { loadFields, loadOrg, logEvent, publicOrg } from '../db';
import { cleanText, fail, newId, normalizeEmail, optionalText } from '../util';
import { connectAccount, disconnectAccount, syncTask } from '../atproto';
import type { FieldType, Requirement } from '../../shared/types';

export const STARTER_FIELDS: { label: string; type: FieldType; options: string[] }[] = [
  { label: 'Skills', type: 'many', options: [] },
  { label: 'Experience', type: 'one', options: ['New', 'Has done it before', 'Can lead'] },
  { label: 'Age group', type: 'one', options: ['Under 18', '18 or over'] },
  { label: 'Availability', type: 'text', options: [] },
];

const FIELD_TYPES: FieldType[] = ['text', 'number', 'date', 'one', 'many', 'yesno'];

function cleanOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => cleanText(v, 100)).filter(Boolean))].slice(0, 100);
}

function validTimeZone(value: unknown): string {
  const tz = cleanText(value, 64);
  try {
    if (tz) new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Routes that need a signed-in user but no organization yet. */
export const accountRoutes = new Hono<AppBindings>();

accountRoutes.get('/me', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT o.id, o.name, m.role FROM members m JOIN orgs o ON o.id = m.org_id WHERE m.user_id = ? ORDER BY o.created_at',
  )
    .bind(c.get('userId'))
    .all();
  return c.json({ email: c.get('email'), orgs: results });
});

accountRoutes.post('/orgs', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = cleanText(body.name, 120);
  if (!name) fail(400, 'Enter an organization name.');
  const now = c.get('now');
  const orgId = newId();
  const db = c.env.DB;
  await db.batch([
    db.prepare('INSERT INTO orgs (id, name, time_zone, created_at) VALUES (?, ?, ?, ?)').bind(orgId, name, validTimeZone(body.timeZone), now),
    db.prepare("INSERT INTO members (id, org_id, user_id, role, created_at) VALUES (?, ?, ?, 'admin', ?)").bind(newId(), orgId, c.get('userId'), now),
    ...STARTER_FIELDS.map((f, i) =>
      db
        .prepare('INSERT INTO fields (id, org_id, label, type, options_json, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(newId(), orgId, f.label, f.type, JSON.stringify(f.options), i, now),
    ),
    logEvent(db, { orgId, actorKind: 'member', actorId: c.get('userId'), verb: 'created', objectType: 'org', objectId: orgId, at: now }),
  ]);
  return c.json({ id: orgId }, 201);
});

/** Routes under /api/orgs/:orgId. */
export const orgRoutes = new Hono<AppBindings>();

orgRoutes.get('/', async (c) => {
  const actor = c.get('actor');
  const org = await loadOrg(c.env.DB, actor.orgId);
  return c.json({
    org: publicOrg(org!),
    me: { role: actor.role, memberId: actor.memberId, leadTeamIds: actor.leadTeamIds, email: actor.email },
    atprotoReady: Boolean(c.env.ATPROTO_TASK_NSID),
  });
});

orgRoutes.patch('/', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_org');
  const body = await c.req.json().catch(() => ({}));
  const org = (await loadOrg(c.env.DB, actor.orgId))!;
  const name = body.name === undefined ? org.name : cleanText(body.name, 120);
  if (!name) fail(400, 'Enter an organization name.');
  let limit = org.weekly_ask_limit;
  if (body.weeklyAskLimit !== undefined) {
    limit = Number(body.weeklyAskLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 14) fail(400, 'Weekly ask limit must be 1 to 14.');
  }
  let signup = org.signup_url;
  if (body.signupUrl !== undefined) {
    signup = optionalText(body.signupUrl, 500);
    if (signup && !/^https:\/\/[^\s]+$/.test(signup)) fail(400, 'The sign-up link must start with https://');
  }
  const publishDefault = body.publishDefault === undefined ? org.publish_default : body.publishDefault ? 1 : 0;
  const tz = body.timeZone === undefined ? org.time_zone : validTimeZone(body.timeZone);
  await c.env.DB.prepare('UPDATE orgs SET name = ?, weekly_ask_limit = ?, signup_url = ?, publish_default = ?, time_zone = ? WHERE id = ?')
    .bind(name, limit, signup, publishDefault, tz, actor.orgId)
    .run();
  return c.json({ org: publicOrg((await loadOrg(c.env.DB, actor.orgId))!) });
});

// Members: the people who run things in the tool.

orgRoutes.get('/members', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT m.id, m.role, u.email FROM members m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? ORDER BY m.created_at',
  )
    .bind(c.get('actor').orgId)
    .all();
  return c.json({ members: results });
});

orgRoutes.post('/members', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_org');
  const body = await c.req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const role = body.role;
  if (!email) fail(400, 'Enter a valid email address.');
  if (!['admin', 'coordinator', 'lead'].includes(role)) fail(400, 'Choose a role.');
  const now = c.get('now');
  let user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
  if (!user) {
    user = { id: newId() };
    await c.env.DB.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)').bind(user.id, email, now).run();
  }
  const existing = await c.env.DB.prepare('SELECT id FROM members WHERE org_id = ? AND user_id = ?').bind(actor.orgId, user.id).first();
  if (existing) fail(409, 'That person is already a member.');
  const id = newId();
  await c.env.DB.prepare('INSERT INTO members (id, org_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, actor.orgId, user.id, role, now)
    .run();
  return c.json({ id, email, role }, 201);
});

async function adminCount(db: D1Database, orgId: string): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM members WHERE org_id = ? AND role = 'admin'").bind(orgId).first<{ n: number }>();
  return row?.n ?? 0;
}

orgRoutes.patch('/members/:memberId', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_org');
  const body = await c.req.json().catch(() => ({}));
  if (!['admin', 'coordinator', 'lead'].includes(body.role)) fail(400, 'Choose a role.');
  const member = await c.env.DB.prepare('SELECT role FROM members WHERE id = ? AND org_id = ?').bind(c.req.param('memberId'), actor.orgId).first<{ role: string }>();
  if (!member) fail(404, 'Not found');
  if (member.role === 'admin' && body.role !== 'admin' && (await adminCount(c.env.DB, actor.orgId)) <= 1) {
    fail(409, 'Every organization needs at least one admin.');
  }
  await c.env.DB.prepare('UPDATE members SET role = ? WHERE id = ? AND org_id = ?').bind(body.role, c.req.param('memberId'), actor.orgId).run();
  return c.json({ ok: true });
});

orgRoutes.delete('/members/:memberId', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_org');
  const id = c.req.param('memberId');
  const member = await c.env.DB.prepare('SELECT role FROM members WHERE id = ? AND org_id = ?').bind(id, actor.orgId).first<{ role: string }>();
  if (!member) fail(404, 'Not found');
  if (member.role === 'admin' && (await adminCount(c.env.DB, actor.orgId)) <= 1) fail(409, 'Every organization needs at least one admin.');
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM team_leads WHERE member_id = ? AND org_id = ?').bind(id, actor.orgId),
    c.env.DB.prepare('DELETE FROM members WHERE id = ? AND org_id = ?').bind(id, actor.orgId),
  ]);
  return c.json({ ok: true });
});

// Fields: the details the organization tracks about volunteers.

orgRoutes.get('/fields', async (c) => c.json({ fields: await loadFields(c.env.DB, c.get('actor').orgId) }));

orgRoutes.post('/fields', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const body = await c.req.json().catch(() => ({}));
  const label = cleanText(body.label, 80);
  if (!label) fail(400, 'Enter a field name.');
  if (!FIELD_TYPES.includes(body.type)) fail(400, 'Choose a type.');
  const fields = await loadFields(c.env.DB, actor.orgId);
  if (fields.length >= 60) fail(400, 'You can add up to 60 fields.');
  const id = newId();
  await c.env.DB.prepare('INSERT INTO fields (id, org_id, label, type, options_json, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, actor.orgId, label, body.type, JSON.stringify(cleanOptions(body.options)), fields.length, c.get('now'))
    .run();
  return c.json({ id }, 201);
});

orgRoutes.patch('/fields/:fieldId', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const body = await c.req.json().catch(() => ({}));
  const row = await c.env.DB.prepare('SELECT * FROM fields WHERE id = ? AND org_id = ?').bind(c.req.param('fieldId'), actor.orgId).first<Record<string, string>>();
  if (!row) fail(404, 'Not found');
  const label = body.label === undefined ? row.label : cleanText(body.label, 80);
  if (!label) fail(400, 'Enter a field name.');
  const options = body.options === undefined ? row.options_json : JSON.stringify(cleanOptions(body.options));
  const position = Number.isInteger(body.position) ? body.position : row.position;
  await c.env.DB.prepare('UPDATE fields SET label = ?, options_json = ?, position = ? WHERE id = ? AND org_id = ?')
    .bind(label, options, position, row.id, actor.orgId)
    .run();
  return c.json({ ok: true });
});

orgRoutes.delete('/fields/:fieldId', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const id = c.req.param('fieldId');
  await c.env.DB.batch([
    ...(await dropRequirements(c.env.DB, actor.orgId, (r) => r.kind === 'field' && r.fieldId === id)),
    c.env.DB.prepare('DELETE FROM fields WHERE id = ? AND org_id = ?').bind(id, actor.orgId),
  ]);
  return c.json({ ok: true });
});

/**
 * A requirement that names a deleted detail or team would match no one, so
 * deleting either also takes it out of every unfinished task.
 */
async function dropRequirements(db: D1Database, orgId: string, gone: (r: Requirement) => boolean): Promise<D1PreparedStatement[]> {
  const { results } = await db
    .prepare("SELECT id, requirements_json FROM tasks WHERE org_id = ? AND status IN ('draft', 'open', 'filled')")
    .bind(orgId)
    .all<{ id: string; requirements_json: string }>();
  return results.flatMap((t) => {
    const reqs: Requirement[] = JSON.parse(t.requirements_json);
    const kept = reqs.filter((r) => !gone(r));
    return kept.length === reqs.length ? [] : [db.prepare('UPDATE tasks SET requirements_json = ? WHERE id = ?').bind(JSON.stringify(kept), t.id)];
  });
}

// Teams: groups inside the organization. Leads manage their own team's members.

orgRoutes.get('/teams', async (c) => {
  const orgId = c.get('actor').orgId;
  const [teams, members, leads] = await Promise.all([
    c.env.DB.prepare('SELECT id, name FROM teams WHERE org_id = ? ORDER BY name').bind(orgId).all<{ id: string; name: string }>(),
    c.env.DB.prepare('SELECT team_id, volunteer_id FROM team_members WHERE org_id = ?').bind(orgId).all<{ team_id: string; volunteer_id: string }>(),
    c.env.DB.prepare('SELECT team_id, member_id FROM team_leads WHERE org_id = ?').bind(orgId).all<{ team_id: string; member_id: string }>(),
  ]);
  return c.json({
    teams: teams.results.map((t) => ({
      ...t,
      volunteerIds: members.results.filter((m) => m.team_id === t.id).map((m) => m.volunteer_id),
      leadMemberIds: leads.results.filter((l) => l.team_id === t.id).map((l) => l.member_id),
    })),
  });
});

orgRoutes.post('/teams', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const body = await c.req.json().catch(() => ({}));
  const name = cleanText(body.name, 80);
  if (!name) fail(400, 'Enter a team name.');
  const id = newId();
  await c.env.DB.prepare('INSERT INTO teams (id, org_id, name, created_at) VALUES (?, ?, ?, ?)').bind(id, actor.orgId, name, c.get('now')).run();
  return c.json({ id }, 201);
});

orgRoutes.patch('/teams/:teamId', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const body = await c.req.json().catch(() => ({}));
  const name = cleanText(body.name, 80);
  if (!name) fail(400, 'Enter a team name.');
  const res = await c.env.DB.prepare('UPDATE teams SET name = ? WHERE id = ? AND org_id = ?').bind(name, c.req.param('teamId'), actor.orgId).run();
  if (res.meta.changes === 0) fail(404, 'Not found');
  return c.json({ ok: true });
});

orgRoutes.delete('/teams/:teamId', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const id = c.req.param('teamId');
  const team = await c.env.DB.prepare('SELECT id FROM teams WHERE id = ? AND org_id = ?').bind(id, actor.orgId).first();
  if (!team) fail(404, 'Not found');
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM team_members WHERE team_id = ? AND org_id = ?').bind(id, actor.orgId),
    c.env.DB.prepare('DELETE FROM team_leads WHERE team_id = ? AND org_id = ?').bind(id, actor.orgId),
    c.env.DB.prepare('UPDATE tasks SET team_id = NULL WHERE team_id = ? AND org_id = ?').bind(id, actor.orgId),
    ...(await dropRequirements(c.env.DB, actor.orgId, (r) => r.kind === 'team' && r.teamId === id)),
    c.env.DB.prepare('DELETE FROM teams WHERE id = ? AND org_id = ?').bind(id, actor.orgId),
  ]);
  return c.json({ ok: true });
});

async function teamInOrg(db: D1Database, orgId: string, teamId: string) {
  const team = await db.prepare('SELECT id FROM teams WHERE id = ? AND org_id = ?').bind(teamId, orgId).first();
  if (!team) fail(404, 'Not found');
}

orgRoutes.post('/teams/:teamId/members', async (c) => {
  const actor = c.get('actor');
  const teamId = c.req.param('teamId');
  await teamInOrg(c.env.DB, actor.orgId, teamId);
  mustManageTeam(actor, teamId);
  const body = await c.req.json().catch(() => ({}));
  const volunteer = await c.env.DB.prepare('SELECT id FROM volunteers WHERE id = ? AND org_id = ?').bind(body.volunteerId, actor.orgId).first();
  if (!volunteer) fail(404, 'Not found');
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT OR IGNORE INTO team_members (team_id, volunteer_id, org_id) VALUES (?, ?, ?)').bind(teamId, body.volunteerId, actor.orgId),
    logEvent(c.env.DB, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'added_to_team', objectType: 'volunteer', objectId: body.volunteerId, at: c.get('now'), meta: { teamId } }),
  ]);
  return c.json({ ok: true });
});

orgRoutes.delete('/teams/:teamId/members/:volunteerId', async (c) => {
  const actor = c.get('actor');
  const teamId = c.req.param('teamId');
  await teamInOrg(c.env.DB, actor.orgId, teamId);
  mustManageTeam(actor, teamId);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM team_members WHERE team_id = ? AND volunteer_id = ? AND org_id = ?').bind(teamId, c.req.param('volunteerId'), actor.orgId),
    logEvent(c.env.DB, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'removed_from_team', objectType: 'volunteer', objectId: c.req.param('volunteerId'), at: c.get('now'), meta: { teamId } }),
  ]);
  return c.json({ ok: true });
});

orgRoutes.post('/teams/:teamId/leads', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_org');
  const teamId = c.req.param('teamId');
  await teamInOrg(c.env.DB, actor.orgId, teamId);
  const body = await c.req.json().catch(() => ({}));
  const member = await c.env.DB.prepare('SELECT id FROM members WHERE id = ? AND org_id = ?').bind(body.memberId, actor.orgId).first();
  if (!member) fail(404, 'Not found');
  await c.env.DB.prepare('INSERT OR IGNORE INTO team_leads (team_id, member_id, org_id) VALUES (?, ?, ?)').bind(teamId, body.memberId, actor.orgId).run();
  return c.json({ ok: true });
});

orgRoutes.delete('/teams/:teamId/leads/:memberId', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_org');
  await c.env.DB.prepare('DELETE FROM team_leads WHERE team_id = ? AND member_id = ? AND org_id = ?')
    .bind(c.req.param('teamId'), c.req.param('memberId'), actor.orgId)
    .run();
  return c.json({ ok: true });
});

// Saved lists: a People filter with a name.

orgRoutes.get('/lists', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, name, filter_json FROM lists WHERE org_id = ? ORDER BY name').bind(c.get('actor').orgId).all<{
    id: string;
    name: string;
    filter_json: string;
  }>();
  return c.json({ lists: results.map((l) => ({ id: l.id, name: l.name, filter: JSON.parse(l.filter_json) })) });
});

orgRoutes.post('/lists', async (c) => {
  const actor = c.get('actor');
  const body = await c.req.json().catch(() => ({}));
  const name = cleanText(body.name, 80);
  if (!name) fail(400, 'Enter a list name.');
  const filter = JSON.stringify(body.filter ?? {});
  if (filter.length > 5000) fail(400, 'That filter is too large.');
  const id = newId();
  await c.env.DB.prepare('INSERT INTO lists (id, org_id, name, filter_json, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, actor.orgId, name, filter, c.get('now')).run();
  return c.json({ id }, 201);
});

orgRoutes.delete('/lists/:listId', async (c) => {
  await c.env.DB.prepare('DELETE FROM lists WHERE id = ? AND org_id = ?').bind(c.req.param('listId'), c.get('actor').orgId).run();
  return c.json({ ok: true });
});

// AT Protocol account.

orgRoutes.post('/atproto', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_org');
  const body = await c.req.json().catch(() => ({}));
  const account = await connectAccount(c.env, actor.orgId, cleanText(body.identifier, 300), cleanText(body.appPassword, 100));
  // Post the open tasks that are set to be posted.
  const { results } = await c.env.DB.prepare("SELECT id FROM tasks WHERE org_id = ? AND publish = 1 AND status != 'draft'").bind(actor.orgId).all<{ id: string }>();
  for (const t of results) await syncTask(c.env, actor.orgId, t.id);
  return c.json({ account });
});

orgRoutes.delete('/atproto', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_org');
  // Take posted tasks down first, while the account still works.
  const { results } = await c.env.DB.prepare('SELECT id, publish FROM tasks WHERE org_id = ? AND at_uri IS NOT NULL').bind(actor.orgId).all<{ id: string; publish: number }>();
  for (const t of results) {
    await c.env.DB.prepare('UPDATE tasks SET publish = 0 WHERE id = ?').bind(t.id).run();
    await syncTask(c.env, actor.orgId, t.id);
    await c.env.DB.prepare('UPDATE tasks SET publish = ? WHERE id = ?').bind(t.publish, t.id).run();
  }
  await disconnectAccount(c.env, actor.orgId);
  await c.env.DB.prepare('UPDATE tasks SET at_uri = NULL, at_event_uri = NULL, at_error = NULL WHERE org_id = ?').bind(actor.orgId).run();
  return c.json({ ok: true });
});

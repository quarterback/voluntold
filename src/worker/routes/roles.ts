// Roles with terms, and succession (docs/decisions/0015-roles-and-succession.md).
// A role is a job someone holds. Its terms record who held it and when. When
// a holder changes, the role keeps its responsibilities, handoff notes and
// open tasks, so the next person sees what they are inheriting.

import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { must } from '../auth';
import { logEvent } from '../db';
import { cleanText, fail, newId } from '../util';
import { parseDate } from '../../shared/membership';
import { DAY } from '../../shared/rules';

/** A term ending within this long counts as ending soon. */
export const ENDING_SOON = 60 * DAY;

export const roleRoutes = new Hono<AppBindings>();

type TermRow = { id: string; role_id: string; volunteer_id: string; name: string; starts_at: number; ends_at: number | null; ended_at: number | null };

function term(t: TermRow) {
  return { id: t.id, volunteerId: t.volunteer_id, name: t.name, startsAt: t.starts_at, endsAt: t.ends_at, endedAt: t.ended_at };
}

async function loadRole(db: D1Database, orgId: string, id: string) {
  const role = await db.prepare('SELECT * FROM roles WHERE id = ? AND org_id = ?').bind(id, orgId).first<Record<string, unknown>>();
  if (!role) fail(404, 'Not found');
  return role;
}

async function teamOk(db: D1Database, orgId: string, teamId: unknown): Promise<string | null> {
  if (!teamId) return null;
  const row = await db.prepare('SELECT id FROM teams WHERE id = ? AND org_id = ?').bind(String(teamId), orgId).first();
  if (!row) fail(400, "That team doesn't exist.");
  return String(teamId);
}

roleRoutes.get('/roles', async (c) => {
  const orgId = c.get('actor').orgId;
  const db = c.env.DB;
  const [roles, current, past, tasks] = await Promise.all([
    db.prepare('SELECT * FROM roles WHERE org_id = ? ORDER BY name').bind(orgId).all<Record<string, unknown>>(),
    db.prepare('SELECT t.*, v.name FROM role_terms t JOIN volunteers v ON v.id = t.volunteer_id WHERE t.org_id = ? AND t.ended_at IS NULL').bind(orgId).all<TermRow>(),
    db.prepare('SELECT role_id, COUNT(*) AS n FROM role_terms WHERE org_id = ? AND ended_at IS NOT NULL GROUP BY role_id').bind(orgId).all<{ role_id: string; n: number }>(),
    db.prepare("SELECT role_id, COUNT(*) AS n FROM tasks WHERE org_id = ? AND role_id IS NOT NULL AND status IN ('draft', 'open', 'filled') GROUP BY role_id").bind(orgId).all<{ role_id: string; n: number }>(),
  ]);
  const holder = new Map(current.results.map((t) => [t.role_id, term(t)]));
  const pastCount = new Map(past.results.map((r) => [r.role_id, r.n]));
  const open = new Map(tasks.results.map((r) => [r.role_id, r.n]));
  return c.json({
    roles: roles.results.map((r) => ({
      id: r.id, name: r.name, teamId: r.team_id, holder: holder.get(String(r.id)) ?? null,
      pastHolders: pastCount.get(String(r.id)) ?? 0, openTasks: open.get(String(r.id)) ?? 0,
    })),
  });
});

roleRoutes.post('/roles', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const body = await c.req.json().catch(() => ({}));
  const name = cleanText(body.name, 120);
  if (!name) fail(400, 'Enter a role name.');
  const id = newId();
  await c.env.DB.prepare('INSERT INTO roles (id, org_id, name, team_id, responsibilities, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, actor.orgId, name, await teamOk(c.env.DB, actor.orgId, body.teamId), cleanText(body.responsibilities, 5000), c.get('now'))
    .run();
  return c.json({ id }, 201);
});

/** The role, who holds it, everyone who held it before, and the open work that comes with it. */
roleRoutes.get('/roles/:roleId', async (c) => {
  const orgId = c.get('actor').orgId;
  const db = c.env.DB;
  const role = await loadRole(db, orgId, c.req.param('roleId'));
  const [terms, tasks] = await Promise.all([
    db.prepare('SELECT t.*, v.name FROM role_terms t JOIN volunteers v ON v.id = t.volunteer_id WHERE t.role_id = ? AND t.org_id = ? ORDER BY t.starts_at DESC')
      .bind(role.id, orgId).all<TermRow>(),
    db.prepare("SELECT id, title, status, starts_at, due_at FROM tasks WHERE role_id = ? AND org_id = ? AND status IN ('draft', 'open', 'filled') ORDER BY COALESCE(starts_at, due_at)")
      .bind(role.id, orgId).all<Record<string, unknown>>(),
  ]);
  const current = terms.results.find((t) => t.ended_at === null);
  return c.json({
    role: { id: role.id, name: role.name, teamId: role.team_id, responsibilities: role.responsibilities, handoff: role.handoff },
    holder: current ? term(current) : null,
    history: terms.results.filter((t) => t.ended_at !== null).map(term),
    openTasks: tasks.results.map((t) => ({ id: t.id, title: t.title, status: t.status, startsAt: t.starts_at, dueAt: t.due_at })),
  });
});

roleRoutes.patch('/roles/:roleId', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const db = c.env.DB;
  const role = await loadRole(db, actor.orgId, c.req.param('roleId'));
  const body = await c.req.json().catch(() => ({}));
  const name = body.name === undefined ? role.name : cleanText(body.name, 120);
  if (!name) fail(400, 'Enter a role name.');
  const teamId = body.teamId === undefined ? role.team_id : await teamOk(db, actor.orgId, body.teamId);
  const responsibilities = body.responsibilities === undefined ? role.responsibilities : cleanText(body.responsibilities, 5000);
  const handoff = body.handoff === undefined ? role.handoff : cleanText(body.handoff, 5000);
  await db.prepare('UPDATE roles SET name = ?, team_id = ?, responsibilities = ?, handoff = ? WHERE id = ? AND org_id = ?')
    .bind(name, teamId, responsibilities, handoff, role.id, actor.orgId).run();
  return c.json({ ok: true });
});

roleRoutes.delete('/roles/:roleId', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const db = c.env.DB;
  const role = await loadRole(db, actor.orgId, c.req.param('roleId'));
  await db.batch([
    db.prepare('UPDATE tasks SET role_id = NULL WHERE role_id = ? AND org_id = ?').bind(role.id, actor.orgId),
    db.prepare('DELETE FROM role_terms WHERE role_id = ? AND org_id = ?').bind(role.id, actor.orgId),
    db.prepare('DELETE FROM roles WHERE id = ? AND org_id = ?').bind(role.id, actor.orgId),
  ]);
  return c.json({ ok: true });
});

/** Give the role to someone. The current holder's term ends today and moves to the history. */
roleRoutes.post('/roles/:roleId/assign', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const db = c.env.DB;
  const role = await loadRole(db, actor.orgId, c.req.param('roleId'));
  const body = await c.req.json().catch(() => ({}));
  const person = await db.prepare('SELECT id FROM volunteers WHERE id = ? AND org_id = ?').bind(String(body.volunteerId ?? ''), actor.orgId).first<{ id: string }>();
  if (!person) fail(404, 'Not found');
  const now = c.get('now');
  const start = parseDate(body.startsAt);
  const end = parseDate(body.endsAt);
  if (start === 'bad' || end === 'bad') fail(400, 'Enter valid dates.');
  const startsAt = start ?? now;
  if (end !== null && end <= startsAt) fail(400, 'The term must end after it starts.');
  const id = newId();
  await db.batch([
    db.prepare('UPDATE role_terms SET ended_at = ? WHERE role_id = ? AND org_id = ? AND ended_at IS NULL').bind(now, role.id, actor.orgId),
    db.prepare('INSERT INTO role_terms (id, org_id, role_id, volunteer_id, starts_at, ends_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, actor.orgId, role.id, person.id, startsAt, end, now),
    logEvent(db, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'assigned_role', objectType: 'role', objectId: String(role.id), at: now, meta: { volunteerId: person.id } }),
  ]);
  return c.json({ id });
});

/** End the current term and leave the role open. */
roleRoutes.post('/roles/:roleId/vacate', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const role = await loadRole(c.env.DB, actor.orgId, c.req.param('roleId'));
  await c.env.DB.prepare('UPDATE role_terms SET ended_at = ? WHERE role_id = ? AND org_id = ? AND ended_at IS NULL').bind(c.get('now'), role.id, actor.orgId).run();
  return c.json({ ok: true });
});

/** Change the end date of the current term. */
roleRoutes.patch('/roles/:roleId/term', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const role = await loadRole(c.env.DB, actor.orgId, c.req.param('roleId'));
  const body = await c.req.json().catch(() => ({}));
  const end = parseDate(body.endsAt);
  if (end === 'bad') fail(400, 'Enter a valid date.');
  await c.env.DB.prepare('UPDATE role_terms SET ends_at = ? WHERE role_id = ? AND org_id = ? AND ended_at IS NULL').bind(end, role.id, actor.orgId).run();
  return c.json({ ok: true });
});

/** The roles a person holds now and held before. */
export async function rolesOf(db: D1Database, orgId: string, volunteerId: string) {
  const { results } = await db
    .prepare('SELECT t.*, r.name FROM role_terms t JOIN roles r ON r.id = t.role_id WHERE t.org_id = ? AND t.volunteer_id = ? ORDER BY t.starts_at DESC')
    .bind(orgId, volunteerId)
    .all<TermRow>();
  return results.map((t) => ({ roleId: t.role_id, name: t.name, startsAt: t.starts_at, endsAt: t.ends_at, endedAt: t.ended_at }));
}

/** Links a task to a role, or clears it. The role must be in the same organization. */
export async function setTaskRole(db: D1Database, orgId: string, taskId: string, roleId: unknown): Promise<void> {
  if (roleId === undefined) return;
  let id: string | null = null;
  if (roleId) {
    const row = await db.prepare('SELECT id FROM roles WHERE id = ? AND org_id = ?').bind(String(roleId), orgId).first<{ id: string }>();
    if (!row) fail(400, "That role doesn't exist.");
    id = row.id;
  }
  await db.prepare('UPDATE tasks SET role_id = ? WHERE id = ? AND org_id = ?').bind(id, taskId, orgId).run();
}

// Row mappers and loaders. Every loader takes orgId and filters on it, so a
// route can't read another organization's rows by passing a foreign id.

import type { Field, FieldValue, Requirement, Task, Volunteer } from '../shared/types';
import { newId, parseJson } from './util';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export function toField(r: Row): Field {
  return { id: r.id, label: r.label, type: r.type, options: parseJson<string[]>(r.options_json, []), position: r.position };
}

export function toVolunteer(r: Row, teamIds: string[] = []): Volunteer {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    contactOkAt: r.contact_ok_at,
    status: r.status,
    pausedUntil: r.paused_until,
    pausedReason: r.paused_reason,
    values: parseJson<Record<string, FieldValue>>(r.values_json, {}),
    teamIds,
    lastAskedAt: r.last_asked_at,
    unansweredStreak: r.unanswered_streak,
  };
}

export function toTask(r: Row): Task {
  return {
    id: r.id,
    teamId: r.team_id,
    title: r.title,
    description: r.description,
    contact: r.contact,
    timing: r.timing,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    dueAt: r.due_at,
    placePublic: r.place_public,
    placePrivate: r.place_private,
    peopleNeeded: r.people_needed,
    requirements: parseJson<Requirement[]>(r.requirements_json, []),
    askMode: r.ask_mode,
    askBatch: r.ask_batch,
    askWaitHours: r.ask_wait_hours,
    nextRoundAt: r.next_round_at,
    publish: r.publish === 1,
    status: r.status,
  };
}

export async function loadFields(db: D1Database, orgId: string): Promise<Field[]> {
  const { results } = await db.prepare('SELECT * FROM fields WHERE org_id = ? ORDER BY position, created_at').bind(orgId).all();
  return results.map(toField);
}

export async function teamIdsByVolunteer(db: D1Database, orgId: string): Promise<Map<string, string[]>> {
  const { results } = await db.prepare('SELECT team_id, volunteer_id FROM team_members WHERE org_id = ?').bind(orgId).all();
  const map = new Map<string, string[]>();
  for (const r of results as Row[]) {
    const list = map.get(r.volunteer_id) ?? [];
    list.push(r.team_id);
    map.set(r.volunteer_id, list);
  }
  return map;
}

export async function loadVolunteers(db: D1Database, orgId: string): Promise<Volunteer[]> {
  const [{ results }, teams] = await Promise.all([
    db.prepare('SELECT * FROM volunteers WHERE org_id = ? ORDER BY name').bind(orgId).all(),
    teamIdsByVolunteer(db, orgId),
  ]);
  return results.map((r) => toVolunteer(r, teams.get((r as Row).id) ?? []));
}

export async function loadVolunteer(db: D1Database, orgId: string, id: string): Promise<Volunteer | null> {
  const row = await db.prepare('SELECT * FROM volunteers WHERE org_id = ? AND id = ?').bind(orgId, id).first();
  if (!row) return null;
  const { results } = await db
    .prepare('SELECT team_id FROM team_members WHERE org_id = ? AND volunteer_id = ?')
    .bind(orgId, id)
    .all();
  return toVolunteer(row, results.map((r) => (r as Row).team_id));
}

export async function loadTask(db: D1Database, orgId: string, id: string): Promise<Task | null> {
  const row = await db.prepare('SELECT * FROM tasks WHERE org_id = ? AND id = ?').bind(orgId, id).first();
  return row ? toTask(row) : null;
}

export async function loadOrg(db: D1Database, orgId: string): Promise<Row | null> {
  return db.prepare('SELECT * FROM orgs WHERE id = ?').bind(orgId).first();
}

export function publicOrg(r: Row) {
  return {
    id: r.id,
    name: r.name,
    weeklyAskLimit: r.weekly_ask_limit,
    signupUrl: r.signup_url,
    publishDefault: r.publish_default === 1,
    timeZone: r.time_zone,
    atproto: r.atproto_did ? { did: r.atproto_did, handle: r.atproto_handle, service: r.atproto_service } : null,
  };
}

export function logEvent(
  db: D1Database,
  e: { orgId: string; actorKind: 'member' | 'volunteer' | 'system'; actorId: string | null; verb: string; objectType: string; objectId: string; at: number; meta?: unknown },
): D1PreparedStatement {
  return db
    .prepare(
      'INSERT INTO events (id, org_id, actor_kind, actor_id, verb, object_type, object_id, at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(newId(), e.orgId, e.actorKind, e.actorId, e.verb, e.objectType, e.objectId, e.at, JSON.stringify(e.meta ?? {}));
}

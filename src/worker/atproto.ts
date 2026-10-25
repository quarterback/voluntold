// Posting tasks to the organization's own AT Protocol account.
//
// Only tasks go on AT Protocol (docs/decisions/0006-only-tasks-go-on-at-protocol.md).
// Nothing about volunteers is ever written here. This module sees the task
// row and the organization's account, and nothing else.
//
// The pilot signs in with an app password the organization creates in its
// Bluesky settings. AT Protocol OAuth replaces it once the one-day test on
// Workers passes (docs/SPEC.md, "For the coding agent").

import type { Env } from './env';
import { loadFields, loadOrg, loadTask, logEvent } from './db';
import { requirementText } from '../shared/rules';
import { decryptSecret, encryptSecret, fail } from './util';
import type { Task } from '../shared/types';

const EVENT_NSID = 'community.lexicon.calendar.event';
const PUBLIC_API = 'https://public.api.bsky.app';
const PLC = 'https://plc.directory';

interface Session {
  did: string;
  handle: string;
  accessJwt: string;
  service: string;
  expires: number;
}

// Sessions are reused for a while so posting doesn't sign in every time.
const sessions = new Map<string, Session>();

async function xrpc<T>(service: string, method: string, init: { token?: string; body?: unknown; query?: Record<string, string> }): Promise<T> {
  const url = new URL(`/xrpc/${method}`, service);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: init.body === undefined ? 'GET' : 'POST',
    headers: {
      ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text.slice(0, 200);
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? message;
    } catch {
      // keep the raw text
    }
    throw new Error(`${method} failed (${res.status}): ${message}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

/** Finds the server that hosts an account, from its handle or DID. */
export async function resolveService(identifier: string): Promise<{ did: string; service: string }> {
  let did = identifier.trim().replace(/^@/, '');
  if (!did.startsWith('did:')) {
    const res = await xrpc<{ did: string }>(PUBLIC_API, 'com.atproto.identity.resolveHandle', { query: { handle: did } });
    did = res.did;
  }
  let doc: { service?: { id: string; type: string; serviceEndpoint: string }[] };
  if (did.startsWith('did:plc:')) {
    const res = await fetch(`${PLC}/${did}`);
    if (!res.ok) throw new Error('Could not look up that account.');
    doc = await res.json();
  } else if (did.startsWith('did:web:')) {
    const res = await fetch(`https://${did.slice('did:web:'.length)}/.well-known/did.json`);
    if (!res.ok) throw new Error('Could not look up that account.');
    doc = await res.json();
  } else {
    throw new Error('That is not an AT Protocol account.');
  }
  const pds = doc.service?.find((s) => s.id.endsWith('#atproto_pds'));
  if (!pds) throw new Error('That account has no server listed.');
  return { did, service: pds.serviceEndpoint };
}

async function createSession(service: string, identifier: string, password: string): Promise<Session> {
  const res = await xrpc<{ did: string; handle: string; accessJwt: string }>(service, 'com.atproto.server.createSession', {
    body: { identifier, password },
  });
  return { did: res.did, handle: res.handle, accessJwt: res.accessJwt, service, expires: Date.now() + 60 * 60 * 1000 };
}

/** Checks the account and app password, then stores them for the organization. */
export async function connectAccount(env: Env, orgId: string, identifier: string, appPassword: string) {
  if (!identifier || !appPassword) fail(400, 'Enter the account handle and an app password.');
  let session: Session;
  try {
    const { service } = await resolveService(identifier);
    session = await createSession(service, identifier.replace(/^@/, ''), appPassword);
  } catch (e) {
    fail(400, e instanceof Error ? e.message : 'Could not connect that account.');
  }
  sessions.set(orgId, session);
  await env.DB.prepare(
    'UPDATE orgs SET atproto_did = ?, atproto_handle = ?, atproto_service = ?, atproto_secret_enc = ? WHERE id = ?',
  )
    .bind(session.did, session.handle, session.service, await encryptSecret(env, appPassword), orgId)
    .run();
  return { did: session.did, handle: session.handle, service: session.service };
}

export async function disconnectAccount(env: Env, orgId: string) {
  sessions.delete(orgId);
  await env.DB.prepare(
    'UPDATE orgs SET atproto_did = NULL, atproto_handle = NULL, atproto_service = NULL, atproto_secret_enc = NULL WHERE id = ?',
  )
    .bind(orgId)
    .run();
}

async function sessionFor(env: Env, org: Record<string, string | null>): Promise<Session> {
  const cached = sessions.get(org.id!);
  if (cached && cached.expires > Date.now() && cached.did === org.atproto_did) return cached;
  const password = await decryptSecret(env, org.atproto_secret_enc!);
  const session = await createSession(org.atproto_service!, org.atproto_did!, password);
  sessions.set(org.id!, session);
  return session;
}

// Record keys for calendar events must be TIDs: a timestamp in microseconds
// plus a clock id, written in a sortable base32.
const TID_CHARS = '234567abcdefghijklmnopqrstuvwxyz';
export function newTid(nowMs = Date.now()): string {
  const micros = BigInt(nowMs) * 1000n + BigInt(Math.floor(Math.random() * 1000));
  let n = (micros << 10n) | BigInt(Math.floor(Math.random() * 1024));
  let out = '';
  for (let i = 0; i < 13; i++) {
    out = TID_CHARS[Number(n & 31n)] + out;
    n >>= 5n;
  }
  return out;
}

function iso(ms: number | null): string | undefined {
  return ms === null ? undefined : new Date(ms).toISOString();
}

/** The public task record. Built only from fields that are safe to post. */
export function taskRecord(env: Env, task: Task, requirementLines: string[], createdAt: number) {
  return {
    $type: env.ATPROTO_TASK_NSID,
    title: task.title,
    description: task.description || undefined,
    timing: task.timing,
    startsAt: iso(task.timing === 'at_time' ? task.startsAt : null),
    endsAt: iso(task.timing === 'at_time' ? task.endsAt : null),
    dueAt: iso(task.timing === 'by_date' ? task.dueAt : null),
    place: task.placePublic || undefined,
    peopleNeeded: task.peopleNeeded,
    requirements: requirementLines,
    status: task.status,
    url: `${env.APP_URL}/t/${task.id}`,
    createdAt: new Date(createdAt).toISOString(),
  };
}

export function eventRecord(env: Env, task: Task, createdAt: number) {
  const where = task.placePublic ? `\n\nWhere: ${task.placePublic}` : '';
  return {
    $type: EVENT_NSID,
    name: task.title,
    description: `${task.description}${where}`.trim() || undefined,
    createdAt: new Date(createdAt).toISOString(),
    startsAt: iso(task.startsAt),
    endsAt: iso(task.endsAt),
    mode: `${EVENT_NSID}#inperson`,
    status: task.status === 'canceled' ? `${EVENT_NSID}#cancelled` : `${EVENT_NSID}#scheduled`,
    uris: [{ uri: `${env.APP_URL}/t/${task.id}`, name: 'Task page' }],
  };
}

function rkeyOf(uri: string | null): string | null {
  return uri ? uri.split('/').pop() ?? null : null;
}

/**
 * Brings the task's public records in line with the task. Posts or updates
 * them when the task is posted publicly and not a draft, and deletes them
 * otherwise. A failure is stored on the task and shown on Today; it never
 * blocks the coordinator.
 */
export async function syncTask(env: Env, orgId: string, taskId: string): Promise<void> {
  const org = await loadOrg(env.DB, orgId);
  const row = await env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND org_id = ?').bind(taskId, orgId).first<Record<string, never>>();
  if (!org || !row) return;
  const task = (await loadTask(env.DB, orgId, taskId))!;
  const atUri = row.at_uri as string | null;
  const eventUri = row.at_event_uri as string | null;
  const shouldPost = task.publish && task.status !== 'draft';
  if (!org.atproto_did || !env.ATPROTO_TASK_NSID) return;
  if (!shouldPost && !atUri && !eventUri) return;

  try {
    const session = await sessionFor(env, org);
    const repo = session.did;
    let newTaskUri: string | null = atUri;
    let newEventUri: string | null = eventUri;

    if (shouldPost) {
      const lines = await requirementLines(env, orgId, task);
      const put = await xrpc<{ uri: string }>(session.service, 'com.atproto.repo.putRecord', {
        token: session.accessJwt,
        body: { repo, collection: env.ATPROTO_TASK_NSID, rkey: task.id, record: taskRecord(env, task, lines, row.created_at as number) },
      });
      newTaskUri = put.uri;
      if (task.timing === 'at_time') {
        const rkey = rkeyOf(eventUri) ?? newTid();
        const ev = await xrpc<{ uri: string }>(session.service, 'com.atproto.repo.putRecord', {
          token: session.accessJwt,
          body: { repo, collection: EVENT_NSID, rkey, record: eventRecord(env, task, row.created_at as number) },
        });
        newEventUri = ev.uri;
      } else if (eventUri) {
        await deleteRecord(session, EVENT_NSID, rkeyOf(eventUri)!);
        newEventUri = null;
      }
    } else {
      if (atUri) await deleteRecord(session, env.ATPROTO_TASK_NSID, rkeyOf(atUri)!);
      if (eventUri) await deleteRecord(session, EVENT_NSID, rkeyOf(eventUri)!);
      newTaskUri = null;
      newEventUri = null;
    }
    await env.DB.prepare('UPDATE tasks SET at_uri = ?, at_event_uri = ?, at_error = NULL WHERE id = ?').bind(newTaskUri, newEventUri, taskId).run();
  } catch (e) {
    sessions.delete(orgId);
    const message = e instanceof Error ? e.message : 'Unknown error';
    await env.DB.batch([
      env.DB.prepare('UPDATE tasks SET at_error = ? WHERE id = ?').bind(message.slice(0, 300), taskId),
      logEvent(env.DB, { orgId, actorKind: 'system', actorId: null, verb: 'atproto_failed', objectType: 'task', objectId: taskId, at: Date.now(), meta: { message } }),
    ]);
  }
}

async function deleteRecord(session: Session, collection: string, rkey: string) {
  await xrpc(session.service, 'com.atproto.repo.deleteRecord', {
    token: session.accessJwt,
    body: { repo: session.did, collection, rkey },
  });
}

async function requirementLines(env: Env, orgId: string, task: Task): Promise<string[]> {
  const fields = await loadFields(env.DB, orgId);
  const { results } = await env.DB.prepare('SELECT id, name FROM teams WHERE org_id = ?').bind(orgId).all<{ id: string; name: string }>();
  const teams = new Map(results.map((t) => [t.id, t.name]));
  return task.requirements.map((r) => requirementText(r, fields, (id) => teams.get(id) ?? 'unknown'));
}

// Tags on tasks, needs and people (next version spec, section 3).
//
// The model picks tags from the organization's own set when a record is
// created or imported, and makes a new tag only when nothing fits. It sees
// what a record is about, never who it is about: a person's name, email and
// phone stay out of the prompt. With no model configured, tagging is manual.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { Env } from './env';
import { logEvent } from './db';
import { newId } from './util';
import { modelConfigured } from './model';
import { TAGS_PER_ORG_MAX, cleanTagName, nextTagColor, tagKey, type TagColor } from '../shared/tags';
import type { Tag, Taggable } from '../shared/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export function toTag(r: Row): Tag {
  return { id: r.id, name: r.name, color: r.color as TagColor, isNew: r.seen_at === null && r.created_by === 'model', createdAt: r.created_at };
}

export async function loadTags(db: D1Database, orgId: string): Promise<Tag[]> {
  const { results } = await db.prepare('SELECT * FROM tags WHERE org_id = ? ORDER BY name COLLATE NOCASE').bind(orgId).all();
  return results.map(toTag);
}

/** Tag ids on every record of one type, in tag name order. */
export async function tagIdsFor(db: D1Database, orgId: string, type: Taggable): Promise<Map<string, string[]>> {
  const { results } = await db
    .prepare('SELECT tg.object_id, tg.tag_id FROM taggings tg JOIN tags t ON t.id = tg.tag_id WHERE tg.org_id = ? AND tg.object_type = ? ORDER BY t.name COLLATE NOCASE')
    .bind(orgId, type)
    .all<{ object_id: string; tag_id: string }>();
  const map = new Map<string, string[]>();
  for (const r of results) map.set(r.object_id, [...(map.get(r.object_id) ?? []), r.tag_id]);
  return map;
}

export async function tagIdsOf(db: D1Database, orgId: string, type: Taggable, id: string): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT tg.tag_id FROM taggings tg JOIN tags t ON t.id = tg.tag_id WHERE tg.org_id = ? AND tg.object_type = ? AND tg.object_id = ? ORDER BY t.name COLLATE NOCASE')
    .bind(orgId, type, id)
    .all<{ tag_id: string }>();
  return results.map((r) => r.tag_id);
}

/**
 * Finds tags by name, creating the ones that don't exist yet. Names that
 * differ only in case or spacing are the same tag.
 */
export async function ensureTags(
  db: D1Database,
  orgId: string,
  names: string[],
  by: 'member' | 'model' | 'sample',
  now: number,
): Promise<Map<string, Tag>> {
  const tags = await loadTags(db, orgId);
  const byKey = new Map(tags.map((t) => [tagKey(t.name), t]));
  const used = tags.map((t) => t.color);
  const statements: D1PreparedStatement[] = [];
  for (const raw of names) {
    const name = cleanTagName(raw);
    const key = tagKey(name);
    if (!name || byKey.has(key)) continue;
    if (byKey.size >= TAGS_PER_ORG_MAX) break;
    const color = nextTagColor(used);
    used.push(color);
    const tag: Tag = { id: newId(), name, color, isNew: by === 'model', createdAt: now };
    byKey.set(key, tag);
    statements.push(
      db
        .prepare('INSERT INTO tags (id, org_id, name, color, created_by, seen_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(tag.id, orgId, name, color, by, by === 'model' ? null : now, now),
    );
  }
  if (statements.length) await db.batch(statements);
  return byKey;
}

/** Statements that put exactly these tags on a record. */
export function setTagStatements(db: D1Database, orgId: string, type: Taggable, id: string, tagIds: string[], now: number): D1PreparedStatement[] {
  const ids = [...new Set(tagIds)];
  const out = [db.prepare('DELETE FROM taggings WHERE org_id = ? AND object_type = ? AND object_id = ?').bind(orgId, type, id)];
  for (const tagId of ids) {
    out.push(
      db.prepare('INSERT OR IGNORE INTO taggings (org_id, tag_id, object_type, object_id, created_at) VALUES (?, ?, ?, ?, ?)').bind(orgId, tagId, type, id, now),
    );
  }
  return out;
}

/** Adds tags to a record, keeping the ones already there. */
export function addTagStatements(db: D1Database, orgId: string, type: Taggable, id: string, tagIds: string[], now: number): D1PreparedStatement[] {
  return [...new Set(tagIds)].map((tagId) =>
    db.prepare('INSERT OR IGNORE INTO taggings (org_id, tag_id, object_type, object_id, created_at) VALUES (?, ?, ?, ?, ?)').bind(orgId, tagId, type, id, now),
  );
}

/** Moves every record from one tag to another and removes the first. */
export async function mergeTags(db: D1Database, orgId: string, fromId: string, intoId: string, actorId: string, now: number) {
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO taggings (org_id, tag_id, object_type, object_id, created_at)
         SELECT org_id, ?, object_type, object_id, ? FROM taggings WHERE org_id = ? AND tag_id = ?`,
      )
      .bind(intoId, now, orgId, fromId),
    db.prepare('DELETE FROM taggings WHERE org_id = ? AND tag_id = ?').bind(orgId, fromId),
    db.prepare('DELETE FROM tags WHERE org_id = ? AND id = ?').bind(orgId, fromId),
    logEvent(db, { orgId, actorKind: 'member', actorId, verb: 'merged', objectType: 'tag', objectId: intoId, at: now, meta: { from: fromId } }),
  ]);
}

export interface TagInput {
  id: string;
  /** What the record is about. Never a person's name or contact details. */
  text: string;
}

const Picked = z.object({
  records: z.array(z.object({ id: z.string(), tags: z.array(z.string()) })),
});

const CHUNK = 40;
const MAX_NEW_PER_CALL = 8;
const MAX_PER_RECORD = 3;

/**
 * Asks the model to tag records from the organization's set, then saves the
 * result. Runs after the request that created the records has answered, so
 * it never slows a screen down and never fails one. Does nothing when no
 * model is configured.
 */
export async function autoTag(env: Env, orgId: string, type: Taggable, records: TagInput[], now: number): Promise<void> {
  if (!modelConfigured(env)) return;
  const todo = records.filter((r) => r.text.trim());
  for (let i = 0; i < todo.length; i += CHUNK) {
    try {
      await tagChunk(env, orgId, type, todo.slice(i, i + CHUNK), now);
    } catch (e) {
      // Never log record text: it can hold what a coordinator wrote about people.
      console.error('autotag failed', e instanceof Error ? e.message : e);
    }
  }
}

async function tagChunk(env: Env, orgId: string, type: Taggable, records: TagInput[], now: number) {
  const db = env.DB;
  const existing = await loadTags(db, orgId);
  const client = new Anthropic({ apiKey: env.MODEL_API_KEY });
  const kind = type === 'volunteer' ? 'volunteers (described only by what they can do and when)' : type === 'task' ? 'tasks' : 'needs an organization wants to run';
  const response = await client.messages.parse({
    model: env.MODEL_NAME || 'claude-opus-5-5',
    max_tokens: 8000,
    output_config: { effort: 'low', format: zodOutputFormat(Picked) },
    system:
      "You sort a volunteer organization's records with tags so a coordinator can scan them. " +
      'Use the existing tags whenever one fits. Make a new tag only when nothing in the set fits, and keep new tags general enough to use again. ' +
      `A tag name is one to three words in sentence case. Give each record up to ${MAX_PER_RECORD} tags, or none. ` +
      'Return every record id you were given. Never invent record ids.',
    messages: [
      {
        role: 'user',
        content:
          `Record type: ${kind}.\n\nExisting tags:\n${existing.length ? existing.map((t) => `- ${t.name}`).join('\n') : '(none yet)'}\n\n` +
          `Records:\n${records.map((r) => `<record id="${r.id}">\n${r.text.slice(0, 2000)}\n</record>`).join('\n')}`,
      },
    ],
  });
  if (response.stop_reason === 'refusal' || !response.parsed_output) return;

  const wanted = new Set(records.map((r) => r.id));
  const picks = response.parsed_output.records.filter((r) => wanted.has(r.id));
  const known = new Set(existing.map((t) => tagKey(t.name)));
  const newNames: string[] = [];
  for (const p of picks) {
    for (const name of p.tags) {
      const key = tagKey(name);
      if (key && !known.has(key) && !newNames.some((n) => tagKey(n) === key) && newNames.length < MAX_NEW_PER_CALL) newNames.push(cleanTagName(name));
    }
  }
  const byKey = await ensureTags(db, orgId, [...existing.map((t) => t.name), ...newNames], 'model', now);
  const statements: D1PreparedStatement[] = [];
  for (const p of picks) {
    const ids = p.tags.map((n) => byKey.get(tagKey(n))?.id).filter((x): x is string => !!x).slice(0, MAX_PER_RECORD);
    if (ids.length) {
      statements.push(...addTagStatements(db, orgId, type, p.id, ids, now));
      statements.push(logEvent(db, { orgId, actorKind: 'system', actorId: null, verb: 'tagged', objectType: type, objectId: p.id, at: now, meta: { tagIds: ids } }));
    }
  }
  for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
}

/** Runs work after the response goes out, where the runtime allows it. */
export function afterResponse(c: { executionCtx: { waitUntil(p: Promise<unknown>): void } }, work: Promise<unknown>) {
  try {
    c.executionCtx.waitUntil(work);
  } catch {
    void work;
  }
}

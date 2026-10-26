// The organization's tag set, and the tags on one record.

import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { must, mustManageTask } from '../auth';
import { loadTask, logEvent } from '../db';
import { fail } from '../util';
import { cleanTagName, tagKey } from '../../shared/tags';
import type { Taggable } from '../../shared/types';
import { ensureTags, loadTags, mergeTags, setTagStatements } from '../tags';

export const tagRoutes = new Hono<AppBindings>();

tagRoutes.get('/tags', async (c) => {
  const orgId = c.get('actor').orgId;
  const [tags, { results }] = await Promise.all([
    loadTags(c.env.DB, orgId),
    c.env.DB.prepare('SELECT tag_id, COUNT(*) AS n FROM taggings WHERE org_id = ? GROUP BY tag_id').bind(orgId).all<{ tag_id: string; n: number }>(),
  ]);
  const counts = new Map(results.map((r) => [r.tag_id, r.n]));
  return c.json({ tags: tags.map((t) => ({ ...t, count: counts.get(t.id) ?? 0 })) });
});

tagRoutes.post('/tags', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const body = await c.req.json().catch(() => ({}));
  const name = cleanTagName(body.name);
  if (!name) fail(400, 'Enter a tag name.');
  const before = await loadTags(c.env.DB, actor.orgId);
  const found = before.find((t) => tagKey(t.name) === tagKey(name));
  if (found) return c.json({ id: found.id });
  const made = await ensureTags(c.env.DB, actor.orgId, [name], 'member', c.get('now'));
  const tag = made.get(tagKey(name));
  if (!tag) fail(400, 'You can have up to 200 tags.');
  return c.json({ id: tag.id }, 201);
});

async function tagInOrg(db: D1Database, orgId: string, tagId: string) {
  const row = await db.prepare('SELECT id, name FROM tags WHERE id = ? AND org_id = ?').bind(tagId, orgId).first<{ id: string; name: string }>();
  if (!row) fail(404, 'Not found');
  return row;
}

tagRoutes.patch('/tags/:tagId', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const tag = await tagInOrg(c.env.DB, actor.orgId, c.req.param('tagId'));
  const body = await c.req.json().catch(() => ({}));
  const name = cleanTagName(body.name);
  if (!name) fail(400, 'Enter a tag name.');
  const others = (await loadTags(c.env.DB, actor.orgId)).filter((t) => t.id !== tag.id);
  if (others.some((t) => tagKey(t.name) === tagKey(name))) fail(409, 'A tag with that name exists. Merge them instead.');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE tags SET name = ?, seen_at = COALESCE(seen_at, ?) WHERE id = ? AND org_id = ?').bind(name, c.get('now'), tag.id, actor.orgId),
    logEvent(c.env.DB, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'renamed', objectType: 'tag', objectId: tag.id, at: c.get('now'), meta: { from: tag.name, to: name } }),
  ]);
  return c.json({ ok: true });
});

tagRoutes.delete('/tags/:tagId', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const tag = await tagInOrg(c.env.DB, actor.orgId, c.req.param('tagId'));
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM taggings WHERE org_id = ? AND tag_id = ?').bind(actor.orgId, tag.id),
    c.env.DB.prepare('DELETE FROM tags WHERE org_id = ? AND id = ?').bind(actor.orgId, tag.id),
    logEvent(c.env.DB, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'deleted', objectType: 'tag', objectId: tag.id, at: c.get('now'), meta: { name: tag.name } }),
  ]);
  return c.json({ ok: true });
});

/** Moves every record from this tag to another one, which keeps its color. */
tagRoutes.post('/tags/:tagId/merge', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const from = await tagInOrg(c.env.DB, actor.orgId, c.req.param('tagId'));
  const body = await c.req.json().catch(() => ({}));
  const into = await tagInOrg(c.env.DB, actor.orgId, String(body.into ?? ''));
  if (from.id === into.id) fail(400, 'Choose a different tag to merge into.');
  await mergeTags(c.env.DB, actor.orgId, from.id, into.id, actor.memberId, c.get('now'));
  return c.json({ ok: true });
});

/** A coordinator has seen the tags the model made, so the "new" marks go. */
tagRoutes.post('/tags/seen', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  await c.env.DB.prepare('UPDATE tags SET seen_at = ? WHERE org_id = ? AND seen_at IS NULL').bind(c.get('now'), actor.orgId).run();
  return c.json({ ok: true });
});

// The tags on one record. Replaces the whole set, so a screen can send what it shows.

const TYPES: Record<string, Taggable> = { volunteers: 'volunteer', tasks: 'task', needs: 'need' };

tagRoutes.put('/:kind{(volunteers|tasks|needs)}/:objectId/tags', async (c) => {
  const actor = c.get('actor');
  const type = TYPES[c.req.param('kind')];
  const id = c.req.param('objectId');
  const db = c.env.DB;
  if (type === 'task') {
    const task = await loadTask(db, actor.orgId, id);
    if (!task) fail(404, 'Not found');
    mustManageTask(actor, task.teamId);
  } else {
    if (type === 'volunteer') must(actor, 'manage_people');
    else mustManageTask(actor, null);
    const table = type === 'volunteer' ? 'volunteers' : 'needs';
    const row = await db.prepare(`SELECT id FROM ${table} WHERE id = ? AND org_id = ?`).bind(id, actor.orgId).first();
    if (!row) fail(404, 'Not found');
  }
  const body = await c.req.json().catch(() => ({}));
  const now = c.get('now');
  const create: string[] = Array.isArray(body.create) ? body.create.map(cleanTagName).filter(Boolean).slice(0, 10) : [];
  const made = create.length ? await ensureTags(db, actor.orgId, create, 'member', now) : new Map();
  const known = new Set((await loadTags(db, actor.orgId)).map((t) => t.id));
  const wanted: string[] = Array.isArray(body.tagIds) ? body.tagIds.filter((x: unknown) => typeof x === 'string' && known.has(x)) : [];
  for (const name of create) {
    const t = made.get(tagKey(name));
    if (t) wanted.push(t.id);
  }
  await db.batch([
    ...setTagStatements(db, actor.orgId, type, id, wanted, now),
    logEvent(db, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'tagged', objectType: type, objectId: id, at: now, meta: { tagIds: wanted } }),
  ]);
  return c.json({ tagIds: [...new Set(wanted)] });
});

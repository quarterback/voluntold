// Needs: something the organization wants to run, broken into assignments
// (tasks) and the supplies and information it can't start without.

import { Hono } from 'hono';
import type { AppBindings, Env } from '../env';
import { mustManageTask } from '../auth';
import { logEvent, toTask } from '../db';
import { cleanText, fail, newId } from '../util';
import { batchSize } from '../../shared/rules';
import { activeCount, candidates, createAsks, holdingCount, sweep, type NewAsk } from '../engine';
import { syncTask } from '../atproto';
import { afterResponse, autoTag, tagIdsOf } from '../tags';

export const needRoutes = new Hono<AppBindings>();

interface Assignment {
  id: string;
  title: string;
  status: string;
  timing: string;
  startsAt: number | null;
  endsAt: number | null;
  dueAt: number | null;
  remote: boolean;
  effortMinutes: number | null;
  peopleNeeded: number;
  holding: number;
  fits: number;
  /** The person who has waited longest among those who fit. */
  match: { id: string; name: string } | null;
  state: 'covered' | 'offer' | 'asked' | 'gap';
  /** Two hours or longer, so it can be split into shorter pieces. */
  canSplit: boolean;
}

export async function summarizeNeed(env: Env, orgId: string, needId: string, now: number) {
  const db = env.DB;
  const need = await db.prepare('SELECT * FROM needs WHERE id = ? AND org_id = ?').bind(needId, orgId).first<Record<string, any>>();
  if (!need) return null;
  const [{ results: taskRows }, { results: items }] = await Promise.all([
    db.prepare("SELECT * FROM tasks WHERE org_id = ? AND need_id = ? AND status != 'canceled' ORDER BY COALESCE(starts_at, due_at, created_at), title").bind(orgId, needId).all(),
    db.prepare('SELECT id, kind, title, detail, status FROM need_items WHERE org_id = ? AND need_id = ? ORDER BY created_at').bind(orgId, needId).all(),
  ]);
  const assignments: Assignment[] = [];
  const taken = new Set<string>();
  for (const row of taskRows) {
    const task = toTask(row);
    const holding = await holdingCount(db, task.id);
    const waiting = await db.prepare("SELECT COUNT(*) AS n FROM asks WHERE task_id = ? AND status = 'waiting'").bind(task.id).first<{ n: number }>();
    // A draft isn't open yet, so check fit as if it were.
    const all = await candidates(env, orgId, { ...task, status: 'open' }, now);
    const fitting = all.filter((x) => x.reason === null);
    const match = fitting.find((x) => !taken.has(x.volunteer.id)) ?? null;
    if (match) taken.add(match.volunteer.id);
    const open = task.peopleNeeded - holding;
    const state: Assignment['state'] =
      open <= 0 || task.status === 'done' ? 'covered' : (waiting?.n ?? 0) > 0 ? 'asked' : fitting.length > 0 ? 'offer' : 'gap';
    assignments.push({
      id: task.id, title: task.title, status: task.status, timing: task.timing, startsAt: task.startsAt, endsAt: task.endsAt, dueAt: task.dueAt,
      remote: task.remote, effortMinutes: task.effortMinutes, peopleNeeded: task.peopleNeeded, holding, fits: fitting.length,
      match: match ? { id: match.volunteer.id, name: match.volunteer.name } : null, state,
      canSplit: task.timing === 'at_time' && !!task.startsAt && !!task.endsAt && task.endsAt - task.startsAt >= 2 * 3600 * 1000 && open > 0,
    });
  }
  const fitPeople = new Set<string>();
  for (const a of assignments) if (a.match) fitPeople.add(a.match.id);
  const canOffer = assignments.filter((a) => a.state === 'offer').length;
  const gaps = assignments.filter((a) => a.state === 'gap').length + items.filter((i: any) => i.status === 'needed').length;
  const fitTotal = new Set<string>();
  for (const row of taskRows) {
    const task = toTask(row);
    if (task.status === 'done') continue;
    for (const x of await candidates(env, orgId, { ...task, status: 'open' }, now)) if (x.reason === null) fitTotal.add(x.volunteer.id);
  }
  const { results: partnerRows } = await db
    .prepare('SELECT o.id, o.name FROM partners p JOIN orgs o ON o.id = p.partner_org_id WHERE p.org_id = ? ORDER BY o.name')
    .bind(orgId)
    .all<{ id: string; name: string }>();
  const partners = await Promise.all(partnerRows.map(async (p) => ({ ...p, active: await activeCount(db, p.id) })));
  const tags = await tagIdsOf(db, orgId, 'need', need.id);
  return {
    partners,
    need: { id: need.id, title: need.title, startsAt: need.starts_at, repeat: need.repeat, status: need.status, tags },
    assignments,
    items,
    counts: { canOffer, gaps, fit: fitTotal.size, assignments: assignments.length },
  };
}

needRoutes.get('/needs', async (c) => {
  const actor = c.get('actor');
  const now = c.get('now');
  await sweep(c.env, now, actor.orgId);
  const { results } = await c.env.DB.prepare("SELECT id FROM needs WHERE org_id = ? ORDER BY CASE status WHEN 'done' THEN 1 ELSE 0 END, COALESCE(starts_at, created_at)")
    .bind(actor.orgId)
    .all<{ id: string }>();
  const needs = [];
  for (const r of results) {
    const s = await summarizeNeed(c.env, actor.orgId, r.id, now);
    if (s) needs.push({ ...s.need, counts: s.counts, filled: s.assignments.reduce((n, a) => n + Math.min(a.holding, a.peopleNeeded), 0), spots: s.assignments.reduce((n, a) => n + a.peopleNeeded, 0) });
  }
  return c.json({ needs });
});

function readNeed(body: Record<string, unknown>) {
  const title = cleanText(body.title, 200);
  if (!title) fail(400, 'Give the need a title.');
  const startsAt = body.startsAt ? Date.parse(String(body.startsAt)) : null;
  if (startsAt !== null && Number.isNaN(startsAt)) fail(400, 'Choose a start date.');
  const repeat = ['none', 'weekly', 'monthly'].includes(String(body.repeat)) ? String(body.repeat) : 'none';
  return { title, startsAt, repeat };
}

needRoutes.post('/needs', async (c) => {
  const actor = c.get('actor');
  mustManageTask(actor, null);
  const input = readNeed(await c.req.json().catch(() => ({})));
  const id = newId();
  const now = c.get('now');
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO needs (id, org_id, title, starts_at, repeat, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, actor.orgId, input.title, input.startsAt, input.repeat, now, now),
    logEvent(c.env.DB, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'created', objectType: 'need', objectId: id, at: now }),
  ]);
  afterResponse(c, autoTag(c.env, actor.orgId, 'need', [{ id, text: `Need: ${input.title}${input.repeat !== 'none' ? `\nRepeats ${input.repeat}` : ''}` }], now));
  return c.json({ id }, 201);
});

needRoutes.get('/needs/:needId', async (c) => {
  const actor = c.get('actor');
  const now = c.get('now');
  await sweep(c.env, now, actor.orgId);
  const s = await summarizeNeed(c.env, actor.orgId, c.req.param('needId'), now);
  if (!s) fail(404, 'Not found');
  return c.json(s);
});

needRoutes.patch('/needs/:needId', async (c) => {
  const actor = c.get('actor');
  mustManageTask(actor, null);
  const body = await c.req.json().catch(() => ({}));
  const input = readNeed(body);
  const status = ['draft', 'active', 'done'].includes(String(body.status)) ? String(body.status) : null;
  const res = await c.env.DB.prepare('UPDATE needs SET title = ?, starts_at = ?, repeat = ?, status = COALESCE(?, status), updated_at = ? WHERE id = ? AND org_id = ?')
    .bind(input.title, input.startsAt, input.repeat, status, c.get('now'), c.req.param('needId'), actor.orgId)
    .run();
  if (res.meta.changes === 0) fail(404, 'Not found');
  return c.json({ ok: true });
});

needRoutes.post('/needs/:needId/items', async (c) => {
  const actor = c.get('actor');
  mustManageTask(actor, null);
  const body = await c.req.json().catch(() => ({}));
  const title = cleanText(body.title, 200);
  if (!title) fail(400, 'Enter a name.');
  const need = await c.env.DB.prepare('SELECT 1 FROM needs WHERE id = ? AND org_id = ?').bind(c.req.param('needId'), actor.orgId).first();
  if (!need) fail(404, 'Not found');
  const id = newId();
  await c.env.DB.prepare('INSERT INTO need_items (id, org_id, need_id, kind, title, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, actor.orgId, c.req.param('needId'), body.kind === 'info' ? 'info' : 'supply', title, cleanText(body.detail, 300), c.get('now'))
    .run();
  return c.json({ id }, 201);
});

needRoutes.patch('/need-items/:itemId', async (c) => {
  const actor = c.get('actor');
  mustManageTask(actor, null);
  const body = await c.req.json().catch(() => ({}));
  const status = body.status === 'covered' ? 'covered' : 'needed';
  const res = await c.env.DB.prepare('UPDATE need_items SET status = ? WHERE id = ? AND org_id = ?').bind(status, c.req.param('itemId'), actor.orgId).run();
  if (res.meta.changes === 0) fail(404, 'Not found');
  return c.json({ ok: true });
});

needRoutes.delete('/need-items/:itemId', async (c) => {
  const actor = c.get('actor');
  mustManageTask(actor, null);
  await c.env.DB.prepare('DELETE FROM need_items WHERE id = ? AND org_id = ?').bind(c.req.param('itemId'), actor.orgId).run();
  return c.json({ ok: true });
});

needRoutes.delete('/needs/:needId', async (c) => {
  const actor = c.get('actor');
  mustManageTask(actor, null);
  const needId = c.req.param('needId');
  const found = await c.env.DB.prepare('SELECT id FROM needs WHERE id = ? AND org_id = ?').bind(needId, actor.orgId).first();
  if (!found) fail(404, 'Not found');
  // The tasks made from a need outlive it: they keep their own spots and asks,
  // and are deleted one by one from the task page.
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM need_items WHERE need_id = ? AND org_id = ?').bind(needId, actor.orgId),
    c.env.DB.prepare("DELETE FROM taggings WHERE object_type = 'need' AND object_id = ? AND org_id = ?").bind(needId, actor.orgId),
    c.env.DB.prepare('UPDATE tasks SET need_id = NULL WHERE need_id = ? AND org_id = ?').bind(needId, actor.orgId),
    c.env.DB.prepare('DELETE FROM needs WHERE id = ? AND org_id = ?').bind(needId, actor.orgId),
  ]);
  return c.json({ ok: true });
});

/**
 * Offer every assignment that has people who fit: drafts are published, and
 * each one asks its first batch. Returns the links to send.
 */
needRoutes.post('/needs/:needId/offer', async (c) => {
  const actor = c.get('actor');
  mustManageTask(actor, null);
  const now = c.get('now');
  const s = await summarizeNeed(c.env, actor.orgId, c.req.param('needId'), now);
  if (!s) fail(404, 'Not found');
  const db = c.env.DB;
  const asks: NewAsk[] = [];
  for (const a of s.assignments.filter((x) => x.state === 'offer')) {
    if (a.status === 'draft') {
      await db.prepare("UPDATE tasks SET status = 'open', updated_at = ? WHERE id = ? AND org_id = ? AND status = 'draft'").bind(now, a.id, actor.orgId).run();
      await syncTask(c.env, actor.orgId, a.id);
    }
    const row = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(a.id).first();
    const task = toTask(row!);
    const fits = (await candidates(c.env, actor.orgId, task, now)).filter((x) => x.reason === null);
    const open = task.peopleNeeded - a.holding;
    const group = task.askMode === 'everyone' ? fits : fits.slice(0, batchSize(task, open));
    if (group.length === 0) continue;
    const res = await createAsks(c.env, actor.orgId, task.id, group.map((x) => x.volunteer.id), actor.memberId, now);
    asks.push(...res.asks);
  }
  await db.prepare("UPDATE needs SET status = 'active', updated_at = ? WHERE id = ? AND org_id = ? AND status = 'draft'").bind(now, c.req.param('needId'), actor.orgId).run();
  return c.json({ asks });
});

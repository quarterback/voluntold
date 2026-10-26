import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { must } from '../auth';
import { loadFields, loadVolunteer, loadVolunteers, logEvent, toTask } from '../db';
import { cleanText, fail, newId, normalizeEmail, normalizePhone, parseJson } from '../util';
import { standing } from '../../shared/sentences';
import type { AskStatus, Field, FieldValue, Tier, Volunteer } from '../../shared/types';
import { DAY_KEYS, PART_KEYS } from '../../shared/rules';
import { extractRows, modelConfigured } from '../model';
import { firstOffers, sweep } from '../engine';
import { afterResponse, autoTag, tagIdsFor, tagIdsOf, loadTags, type TagInput } from '../tags';
import { TIER_WORDS, usualTimesText } from '../../shared/sentences';

export const peopleRoutes = new Hono<AppBindings>();

/** Turns raw input into a value of the field's type, or null. */
export function coerceValue(field: Field, raw: unknown): FieldValue {
  if (raw === null || raw === undefined) return null;
  if (field.type === 'many') {
    const list = Array.isArray(raw) ? raw : String(raw).split(/[,;|]/);
    const out = [...new Set(list.map((v) => cleanText(String(v), 100)).filter(Boolean))];
    return out.length ? out : null;
  }
  const text = cleanText(String(raw), 1000);
  if (text === '') return null;
  switch (field.type) {
    case 'number': {
      const n = Number(text.replace(/,/g, ''));
      return Number.isFinite(n) ? n : null;
    }
    case 'date': {
      const t = Date.parse(text);
      return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
    }
    case 'yesno':
      if (typeof raw === 'boolean') return raw;
      if (/^(yes|y|true|1|x)$/i.test(text)) return true;
      if (/^(no|n|false|0)$/i.test(text)) return false;
      return null;
    default:
      return text;
  }
}

/**
 * What the model sees when it tags a person: their field values, tier and
 * availability. Never their name, email or phone.
 */
export function volunteerTagText(fields: Field[], v: Pick<Volunteer, 'values' | 'tier' | 'days' | 'remoteOk' | 'hoursWeek'>): string {
  const lines: string[] = [];
  for (const f of fields) {
    const value = v.values[f.id];
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) continue;
    lines.push(`${f.label}: ${Array.isArray(value) ? value.join(', ') : value === true ? 'yes' : value === false ? 'no' : String(value)}`);
  }
  if (v.tier) lines.push(`Tier: ${TIER_WORDS[v.tier]}`);
  if (v.days.length) lines.push(`Usual times: ${usualTimesText(v.days)}`);
  if (v.remoteOk) lines.push('Remote work is fine');
  if (v.hoursWeek) lines.push(`Hours a week: ${v.hoursWeek}`);
  return lines.join('\n');
}

function coerceValues(fields: Field[], input: unknown): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  if (!input || typeof input !== 'object') return out;
  for (const field of fields) {
    if (field.id in (input as Record<string, unknown>)) {
      const v = coerceValue(field, (input as Record<string, unknown>)[field.id]);
      if (v !== null) out[field.id] = v;
    }
  }
  return out;
}

/** Choice fields learn new options from the values people have. */
async function growOptions(db: D1Database, orgId: string, fields: Field[], values: Record<string, FieldValue>[]) {
  const statements: D1PreparedStatement[] = [];
  for (const field of fields) {
    if (field.type !== 'one' && field.type !== 'many') continue;
    const seen = new Set(field.options.map((o) => o.toLowerCase()));
    const added: string[] = [];
    for (const v of values) {
      const value = v[field.id];
      for (const option of Array.isArray(value) ? value : value ? [String(value)] : []) {
        if (!seen.has(option.toLowerCase())) {
          seen.add(option.toLowerCase());
          added.push(option);
        }
      }
    }
    if (added.length) {
      statements.push(
        db.prepare('UPDATE fields SET options_json = ? WHERE id = ? AND org_id = ?').bind(JSON.stringify([...field.options, ...added].slice(0, 200)), field.id, orgId),
      );
    }
  }
  if (statements.length) await db.batch(statements);
}

async function lastAnswers(db: D1Database, orgId: string): Promise<Map<string, AskStatus>> {
  const { results } = await db
    .prepare(
      `SELECT a.volunteer_id, a.status FROM asks a
       JOIN (SELECT volunteer_id, MAX(created_at) AS last FROM asks WHERE org_id = ? GROUP BY volunteer_id) l
         ON l.volunteer_id = a.volunteer_id AND l.last = a.created_at
       WHERE a.org_id = ?`,
    )
    .bind(orgId, orgId)
    .all<{ volunteer_id: string; status: AskStatus }>();
  return new Map(results.map((r) => [r.volunteer_id, r.status]));
}

function view(v: Volunteer, lastAnswer: AskStatus | null, now: number, history?: { asked: number; yes: number }) {
  return { ...v, standing: standing(v, lastAnswer, now), asked: history?.asked ?? 0, yes: history?.yes ?? 0 };
}

/** How many times each person was asked, and how many times they said yes. */
async function histories(db: D1Database, orgId: string): Promise<Map<string, { asked: number; yes: number }>> {
  const { results } = await db
    .prepare("SELECT volunteer_id, COUNT(*) AS asked, SUM(CASE WHEN status = 'yes' THEN 1 ELSE 0 END) AS yes FROM asks WHERE org_id = ? GROUP BY volunteer_id")
    .bind(orgId)
    .all<{ volunteer_id: string; asked: number; yes: number }>();
  return new Map(results.map((r) => [r.volunteer_id, { asked: r.asked, yes: r.yes ?? 0 }]));
}

peopleRoutes.get('/volunteers', async (c) => {
  const orgId = c.get('actor').orgId;
  const now = c.get('now');
  await sweep(c.env, now, orgId);
  const [volunteers, answers, history, offers, tags] = await Promise.all([
    loadVolunteers(c.env.DB, orgId),
    lastAnswers(c.env.DB, orgId),
    histories(c.env.DB, orgId),
    firstOffers(c.env, orgId, now, 200),
    tagIdsFor(c.env.DB, orgId, 'volunteer'),
  ]);
  const offerFor = new Set(offers.map((o) => o.volunteer.id));
  return c.json({
    volunteers: volunteers.map((v) => ({ ...view(v, answers.get(v.id) ?? null, now, history.get(v.id)), offerReady: offerFor.has(v.id), tags: tags.get(v.id) ?? [] })),
  });
});

peopleRoutes.get('/volunteers/:volunteerId', async (c) => {
  const orgId = c.get('actor').orgId;
  const v = await loadVolunteer(c.env.DB, orgId, c.req.param('volunteerId'));
  if (!v) fail(404, 'Not found');
  const [asks, spots] = await Promise.all([
    c.env.DB.prepare(
      'SELECT a.id, a.status, a.created_at, a.answered_at, t.id AS task_id, t.title FROM asks a JOIN tasks t ON t.id = a.task_id WHERE a.org_id = ? AND a.volunteer_id = ? ORDER BY a.created_at DESC LIMIT 100',
    )
      .bind(orgId, v.id)
      .all(),
    c.env.DB.prepare(
      'SELECT t.*, s.id AS spot_id, s.status AS spot_status FROM spots s JOIN tasks t ON t.id = s.task_id WHERE s.org_id = ? AND s.volunteer_id = ? ORDER BY s.created_at DESC LIMIT 100',
    )
      .bind(orgId, v.id)
      .all(),
  ]);
  const [answers, history, tags] = await Promise.all([lastAnswers(c.env.DB, orgId), histories(c.env.DB, orgId), tagIdsOf(c.env.DB, orgId, 'volunteer', v.id)]);
  return c.json({
    volunteer: { ...view(v, answers.get(v.id) ?? null, c.get('now'), history.get(v.id)), tags },
    asks: asks.results,
    spots: spots.results.map((r) => ({ id: r.spot_id, status: r.spot_status, task: toTask(r) })),
  });
});

const TIERS: Tier[] = ['one_time', 'seasonal', 'regular', 'core'];
const SLOTS = new Set(DAY_KEYS.flatMap((d) => PART_KEYS.map((p) => `${d}_${p}`)));

/** Tier, hours a week, usual times and remote, from a request body. Missing keys keep what's saved. */
export function readAvailability(body: Record<string, unknown>, current: Pick<Volunteer, 'tier' | 'hoursWeek' | 'days' | 'remoteOk'>) {
  const tier = body.tier === undefined ? current.tier : body.tier === null || body.tier === '' ? null : (body.tier as Tier);
  if (tier !== null && !TIERS.includes(tier)) fail(400, 'Choose a tier.');
  const rawHours = body.hoursWeek === undefined ? current.hoursWeek : body.hoursWeek;
  const hoursWeek = rawHours === null || rawHours === '' ? null : Number(rawHours);
  if (hoursWeek !== null && (!Number.isFinite(hoursWeek) || hoursWeek < 0 || hoursWeek > 80)) fail(400, 'Hours must be 0 to 80.');
  const days = body.days === undefined ? current.days : Array.isArray(body.days) ? [...new Set(body.days.map(String))].filter((d) => SLOTS.has(d)) : [];
  const remoteOk = body.remoteOk === undefined ? current.remoteOk : Boolean(body.remoteOk);
  return { tier, hoursWeek, days, remoteOk };
}

function contactFrom(body: Record<string, unknown>) {
  const email = body.email ? normalizeEmail(body.email) : null;
  if (body.email && !email) fail(400, 'Enter a valid email address.');
  const phone = body.phone ? normalizePhone(body.phone) : null;
  if (body.phone && !phone) fail(400, 'Enter a valid phone number.');
  return { email, phone };
}

peopleRoutes.post('/volunteers', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const body = await c.req.json().catch(() => ({}));
  const name = cleanText(body.name, 200);
  if (!name) fail(400, 'Enter a name.');
  const { email, phone } = contactFrom(body);
  const fields = await loadFields(c.env.DB, actor.orgId);
  const values = coerceValues(fields, body.values);
  const now = c.get('now');
  const id = newId();
  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO volunteers (id, org_id, name, email, phone, contact_ok_at, values_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(id, actor.orgId, name, email, phone, body.contactOk ? now : null, JSON.stringify(values), now, now),
    logEvent(c.env.DB, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'added', objectType: 'volunteer', objectId: id, at: now }),
  ]);
  await growOptions(c.env.DB, actor.orgId, fields, [values]);
  afterResponse(c, autoTag(c.env, actor.orgId, 'volunteer', [{ id, text: volunteerTagText(fields, { values, tier: null, hoursWeek: null, days: [], remoteOk: false }) }], now));
  return c.json({ id }, 201);
});

peopleRoutes.patch('/volunteers/:volunteerId', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const v = await loadVolunteer(c.env.DB, actor.orgId, c.req.param('volunteerId'));
  if (!v) fail(404, 'Not found');
  const body = await c.req.json().catch(() => ({}));
  const now = c.get('now');
  const name = body.name === undefined ? v.name : cleanText(body.name, 200);
  if (!name) fail(400, 'Enter a name.');
  const contact = contactFrom({ email: body.email === undefined ? v.email : body.email, phone: body.phone === undefined ? v.phone : body.phone });
  const fields = await loadFields(c.env.DB, actor.orgId);
  const values = body.values === undefined ? v.values : coerceValues(fields, body.values);
  let contactOkAt = v.contactOkAt;
  if (body.contactOk === true && contactOkAt === null) contactOkAt = now;
  if (body.contactOk === false) contactOkAt = null;

  let { status, pausedUntil, pausedReason } = v;
  if (body.status === 'active') {
    status = 'active';
    pausedUntil = null;
    pausedReason = null;
  } else if (body.status === 'paused') {
    const until = Date.parse(String(body.pausedUntil ?? ''));
    if (Number.isNaN(until) || until <= now) fail(400, 'Choose a date in the future.');
    status = 'paused';
    pausedUntil = until;
    pausedReason = 'coordinator';
  } else if (body.status === 'stopped') {
    status = 'stopped';
  }
  const avail = readAvailability(body, v);
  await c.env.DB.prepare(
    `UPDATE volunteers SET name = ?, email = ?, phone = ?, contact_ok_at = ?, values_json = ?, status = ?, paused_until = ?, paused_reason = ?,
       unanswered_streak = CASE WHEN ? = 'active' THEN 0 ELSE unanswered_streak END, updated_at = ?,
       tier = ?, hours_week = ?, days_json = ?, remote_ok = ?
     WHERE id = ? AND org_id = ?`,
  )
    .bind(
      name, contact.email, contact.phone, contactOkAt, JSON.stringify(values), status, pausedUntil, pausedReason, status, now,
      avail.tier, avail.hoursWeek, JSON.stringify(avail.days), avail.remoteOk ? 1 : 0, v.id, actor.orgId,
    )
    .run();
  await growOptions(c.env.DB, actor.orgId, fields, [values]);
  return c.json({ ok: true });
});

peopleRoutes.delete('/volunteers/:volunteerId', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_org');
  const id = c.req.param('volunteerId');
  const v = await loadVolunteer(c.env.DB, actor.orgId, id);
  if (!v) fail(404, 'Not found');
  const db = c.env.DB;
  await db.batch([
    db.prepare('DELETE FROM volunteer_sessions WHERE volunteer_id = ? AND org_id = ?').bind(id, actor.orgId),
    db.prepare('DELETE FROM spots WHERE volunteer_id = ? AND org_id = ?').bind(id, actor.orgId),
    db.prepare('DELETE FROM asks WHERE volunteer_id = ? AND org_id = ?').bind(id, actor.orgId),
    db.prepare('DELETE FROM team_members WHERE volunteer_id = ? AND org_id = ?').bind(id, actor.orgId),
    db.prepare("DELETE FROM taggings WHERE object_type = 'volunteer' AND object_id = ? AND org_id = ?").bind(id, actor.orgId),
    db.prepare('DELETE FROM volunteers WHERE id = ? AND org_id = ?').bind(id, actor.orgId),
    logEvent(db, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'deleted', objectType: 'volunteer', objectId: id, at: c.get('now') }),
  ]);
  return c.json({ ok: true });
});

// Import

const MAX_ROWS = 5000;

peopleRoutes.get('/import/status', (c) => c.json({ modelReady: modelConfigured(c.env) }));

/** Text, Word and PDF files: the browser sends the text, a model finds the rows. */
peopleRoutes.post('/import/extract', async (c) => {
  must(c.get('actor'), 'manage_people');
  const body = await c.req.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text : '';
  if (!text.trim()) fail(400, 'That file has no text in it.');
  return c.json(await extractRows(c.env, cleanText(body.fileName, 200) || 'file', text));
});

interface PreviewRow {
  name?: string;
  email?: string;
  phone?: string;
}

/** Finds likely duplicates: same email or phone, in the file or already saved. */
peopleRoutes.post('/import/preview', async (c) => {
  must(c.get('actor'), 'manage_people');
  const body = await c.req.json().catch(() => ({}));
  const rows: PreviewRow[] = Array.isArray(body.rows) ? body.rows.slice(0, MAX_ROWS) : [];
  const existing = await loadVolunteers(c.env.DB, c.get('actor').orgId);
  const byEmail = new Map<string, Volunteer>();
  const byPhone = new Map<string, Volunteer>();
  for (const v of existing) {
    if (v.email) byEmail.set(v.email, v);
    if (v.phone) byPhone.set(v.phone, v);
  }
  const seenEmail = new Map<string, number>();
  const seenPhone = new Map<string, number>();
  const result = rows.map((r, i) => {
    const email = normalizeEmail(r.email);
    const phone = normalizePhone(r.phone);
    const name = cleanText(r.name, 200);
    let problem: string | null = null;
    if (!name) problem = 'No name';
    else if (!email && !phone) problem = 'No email or phone';
    const match = (email && byEmail.get(email)) || (phone && byPhone.get(phone)) || null;
    const earlier = (email && seenEmail.get(email)) ?? (phone && seenPhone.get(phone)) ?? null;
    if (email && !seenEmail.has(email)) seenEmail.set(email, i);
    if (phone && !seenPhone.has(phone)) seenPhone.set(phone, i);
    return {
      index: i,
      problem,
      duplicateOf: match ? { volunteerId: match.id, name: match.name, email: match.email, phone: match.phone } : null,
      duplicateOfRow: match ? null : earlier,
    };
  });
  return c.json({ rows: result });
});

type Target = 'name' | 'email' | 'phone' | 'ignore' | `field:${string}` | `new:${string}`;

interface CommitRow {
  cells: Record<string, string>;
  action: 'add' | 'merge' | 'skip';
  mergeInto?: string;
  mergeIntoRow?: number;
}

function mergeValues(fields: Field[], base: Record<string, FieldValue>, extra: Record<string, FieldValue>) {
  const out = { ...base };
  for (const field of fields) {
    const add = extra[field.id];
    if (add === undefined || add === null) continue;
    const current = out[field.id];
    if (field.type === 'many' && Array.isArray(current) && Array.isArray(add)) {
      out[field.id] = [...new Set([...current, ...add])];
    } else if (current === undefined || current === null || current === '') {
      out[field.id] = add;
    }
  }
  return out;
}

peopleRoutes.post('/import/commit', async (c) => {
  const actor = c.get('actor');
  must(actor, 'manage_people');
  const body = await c.req.json().catch(() => ({}));
  if (body.contactConfirmed !== true) fail(400, 'Confirm these people consented to contact.');
  const rows: CommitRow[] = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) fail(400, 'There are no rows to import.');
  if (rows.length > MAX_ROWS) fail(400, `Import up to ${MAX_ROWS} rows at a time.`);
  const columnMap: Record<string, Target> = body.columnMap && typeof body.columnMap === 'object' ? body.columnMap : {};
  const db = c.env.DB;
  const now = c.get('now');

  // Columns that become new fields.
  let fields = await loadFields(db, actor.orgId);
  const newFieldStatements: D1PreparedStatement[] = [];
  for (const [column, target] of Object.entries(columnMap)) {
    if (typeof target === 'string' && target.startsWith('new:')) {
      const label = cleanText(target.slice(4), 80) || cleanText(column, 80);
      const id = newId();
      newFieldStatements.push(
        db.prepare('INSERT INTO fields (id, org_id, label, type, options_json, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, actor.orgId, label, 'text', '[]', fields.length + newFieldStatements.length, now),
      );
      columnMap[column] = `field:${id}`;
    }
  }
  if (newFieldStatements.length) await db.batch(newFieldStatements);
  fields = await loadFields(db, actor.orgId);
  const fieldById = new Map(fields.map((f) => [f.id, f]));

  const existing = new Map((await loadVolunteers(db, actor.orgId)).map((v) => [v.id, v]));
  const importId = newId();
  const setAside: { row: number; reason: string; cells: Record<string, string> }[] = [];
  const created = new Map<number, { id: string; values: Record<string, FieldValue> }>();
  const statements: D1PreparedStatement[] = [];
  const allValues: Record<string, FieldValue>[] = [];
  let added = 0;
  let merged = 0;

  rows.forEach((row, index) => {
    if (row.action === 'skip') return;
    const raw: Record<string, unknown> = {};
    const values: Record<string, FieldValue> = {};
    for (const [column, target] of Object.entries(columnMap)) {
      const cell = row.cells?.[column];
      if (cell === undefined) continue;
      if (target === 'name' || target === 'email' || target === 'phone') {
        raw[target] = raw[target] ? `${raw[target]} ${cell}` : cell;
      } else if (typeof target === 'string' && target.startsWith('field:')) {
        const field = fieldById.get(target.slice(6));
        if (!field) continue;
        const v = coerceValue(field, cell);
        if (v !== null) values[field.id] = field.type === 'many' && Array.isArray(values[field.id]) ? [...(values[field.id] as string[]), ...(v as string[])] : v;
      }
    }
    allValues.push(values);
    const name = cleanText(raw.name, 200);
    const email = normalizeEmail(raw.email);
    const phone = normalizePhone(raw.phone);

    if (row.action === 'merge') {
      if (row.mergeInto && existing.has(row.mergeInto)) {
        const v = existing.get(row.mergeInto)!;
        const next = mergeValues(fields, v.values, values);
        statements.push(
          db
            .prepare('UPDATE volunteers SET email = COALESCE(email, ?), phone = COALESCE(phone, ?), values_json = ?, contact_ok_at = COALESCE(contact_ok_at, ?), updated_at = ? WHERE id = ? AND org_id = ?')
            .bind(email, phone, JSON.stringify(next), now, now, v.id, actor.orgId),
        );
        v.values = next;
        merged++;
        return;
      }
      if (row.mergeIntoRow !== undefined && created.has(row.mergeIntoRow)) {
        const target = created.get(row.mergeIntoRow)!;
        target.values = mergeValues(fields, target.values, values);
        merged++;
        return;
      }
    }
    if (!name) {
      setAside.push({ row: index, reason: 'No name', cells: row.cells });
      return;
    }
    if (!email && !phone) {
      setAside.push({ row: index, reason: 'No email or phone', cells: row.cells });
      return;
    }
    const id = newId();
    created.set(index, { id, values });
    added++;
    statements.push(
      db
        .prepare('INSERT INTO volunteers (id, org_id, name, email, phone, contact_ok_at, values_json, import_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, actor.orgId, name, email, phone, now, '{}', importId, now, now),
    );
  });
  // Values for new rows are written last, after any merges from later rows.
  for (const { id, values } of created.values()) {
    statements.push(db.prepare('UPDATE volunteers SET values_json = ? WHERE id = ?').bind(JSON.stringify(values), id));
  }
  statements.push(
    db
      .prepare('INSERT INTO imports (id, org_id, file_name, file_type, column_map_json, added, merged, set_aside_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(importId, actor.orgId, cleanText(body.fileName, 200) || 'file', cleanText(body.fileType, 40) || 'unknown', JSON.stringify(columnMap), added, merged, JSON.stringify(setAside), actor.memberId, now),
    logEvent(db, { orgId: actor.orgId, actorKind: 'member', actorId: actor.memberId, verb: 'imported', objectType: 'import', objectId: importId, at: now, meta: { added, merged, setAside: setAside.length } }),
  );
  for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
  await growOptions(db, actor.orgId, fields, allValues);
  // Imported people get tags with no coordinator action. The model sees field values only.
  const toTag: TagInput[] = [...created.values()].map(({ id, values }) => ({ id, text: volunteerTagText(fields, { values, tier: null, days: [], remoteOk: false, hoursWeek: null }) }));
  afterResponse(c, autoTag(c.env, actor.orgId, 'volunteer', toTag, now));
  return c.json({ importId, added, merged, setAside });
});

peopleRoutes.get('/imports', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, file_name, file_type, added, merged, set_aside_json, set_aside_cleared, created_at FROM imports WHERE org_id = ? ORDER BY created_at DESC LIMIT 50',
  )
    .bind(c.get('actor').orgId)
    .all<Record<string, string | number>>();
  return c.json({
    imports: results.map((r) => ({ ...r, set_aside: r.set_aside_cleared ? [] : parseJson(r.set_aside_json as string, []), set_aside_json: undefined })),
  });
});

peopleRoutes.post('/imports/:importId/clear', async (c) => {
  must(c.get('actor'), 'manage_people');
  await c.env.DB.prepare('UPDATE imports SET set_aside_cleared = 1 WHERE id = ? AND org_id = ?').bind(c.req.param('importId'), c.get('actor').orgId).run();
  return c.json({ ok: true });
});

// Export: everything, as CSV or one JSON file with stable IDs.

function csv(rows: Record<string, unknown>[], columns: string[]): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : String(v);
    // Leading =, +, - or @ would run as a formula in a spreadsheet.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((col) => cell(r[col])).join(','))].join('\n');
}

const iso = (ms: unknown) => (typeof ms === 'number' ? new Date(ms).toISOString() : '');

async function exportData(db: D1Database, orgId: string) {
  const fields = await loadFields(db, orgId);
  const volunteers = await loadVolunteers(db, orgId);
  const q = (sql: string) => db.prepare(sql).bind(orgId).all<Record<string, unknown>>().then((r) => r.results);
  const [tasks, asks, spots, teams, tags, volunteerTags] = await Promise.all([
    q('SELECT * FROM tasks WHERE org_id = ? ORDER BY created_at'),
    q('SELECT id, task_id, volunteer_id, status, created_at, expires_at, answered_at FROM asks WHERE org_id = ? ORDER BY created_at'),
    q('SELECT id, task_id, volunteer_id, status, created_at, updated_at FROM spots WHERE org_id = ? ORDER BY created_at'),
    q('SELECT id, name FROM teams WHERE org_id = ?'),
    loadTags(db, orgId),
    tagIdsFor(db, orgId, 'volunteer'),
  ]);
  const tagName = new Map(tags.map((t) => [t.id, t.name]));
  return {
    fields,
    volunteers: volunteers.map((v) => ({ ...v, tags: (volunteerTags.get(v.id) ?? []).map((id) => tagName.get(id) ?? id) })),
    tasks: tasks.map(toTask), asks, spots, teams, tags,
  };
}

peopleRoutes.get('/export.json', async (c) => {
  const actor = c.get('actor');
  must(actor, 'export');
  const data = await exportData(c.env.DB, actor.orgId);
  c.header('content-disposition', 'attachment; filename="export.json"');
  return c.json({ exportedAt: new Date(c.get('now')).toISOString(), format: 'voluntold-export-1', ...data });
});

peopleRoutes.get('/export/:kind{(volunteers|tasks|asks|spots)\\.csv}', async (c) => {
  const actor = c.get('actor');
  must(actor, 'export');
  const data = await exportData(c.env.DB, actor.orgId);
  const kind = c.req.param('kind').replace('.csv', '');
  let body = '';
  if (kind === 'volunteers') {
    const teamName = new Map(data.teams.map((t) => [t.id as string, t.name as string]));
    body = csv(
      data.volunteers.map((v) => ({
        id: v.id,
        name: v.name,
        email: v.email,
        phone: v.phone,
        status: v.status,
        agreed_to_contact: iso(v.contactOkAt),
        last_asked: iso(v.lastAskedAt),
        teams: v.teamIds.map((t) => teamName.get(t) ?? t),
        tags: v.tags,
        ...Object.fromEntries(data.fields.map((f) => [f.label, v.values[f.id]])),
      })),
      ['id', 'name', 'email', 'phone', 'status', 'agreed_to_contact', 'last_asked', 'teams', 'tags', ...data.fields.map((f) => f.label)],
    );
  } else if (kind === 'tasks') {
    body = csv(
      data.tasks.map((t) => ({ ...t, startsAt: iso(t.startsAt), endsAt: iso(t.endsAt), dueAt: iso(t.dueAt), requirements: JSON.stringify(t.requirements) })),
      ['id', 'title', 'description', 'status', 'timing', 'startsAt', 'endsAt', 'dueAt', 'placePublic', 'placePrivate', 'peopleNeeded', 'requirements', 'askMode', 'teamId', 'publish'],
    );
  } else if (kind === 'asks') {
    body = csv(
      data.asks.map((a) => ({ ...a, created_at: iso(a.created_at), expires_at: iso(a.expires_at), answered_at: iso(a.answered_at) })),
      ['id', 'task_id', 'volunteer_id', 'status', 'created_at', 'expires_at', 'answered_at'],
    );
  } else {
    body = csv(data.spots.map((s) => ({ ...s, created_at: iso(s.created_at), updated_at: iso(s.updated_at) })), ['id', 'task_id', 'volunteer_id', 'status', 'created_at', 'updated_at']);
  }
  return c.body(body, 200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${kind}.csv"` });
});

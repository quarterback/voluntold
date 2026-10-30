// Sample organizations for the demo (docs/specs/demo.md). Each dataset in
// samples/ describes one organization; this file turns it into rows. Everything
// uses example.com addresses and made-up people.

import type { Env } from './env';
import { loadFields } from './db';
import { hashToken, newId, newToken } from './util';
import { STARTER_FIELDS } from './routes/org';
import { DAY, HOUR, LINK_LIFETIME } from '../shared/rules';
import { ensureTags, addTagStatements } from './tags';
import { DAY_TEXT, type Ctx, type Dataset, type Person } from './samples/common';
import { pantry } from './samples/pantry';
import { membership } from './samples/membership';
import { radio } from './samples/radio';
import { youth } from './samples/youth';
import { disaster } from './samples/disaster';
import { events } from './samples/events';

export const DATASETS: Record<string, Dataset> = { pantry, membership, radio, youth, disaster, events };

/** Milliseconds for a wall-clock time in a time zone, `days` from today. */
function at(now: number, tz: string, days: number, hour: number, minute = 0): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(now)).map((x) => [x.type, x.value]),
  );
  const guess = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + days, hour, minute);
  const local = new Date(new Date(guess).toLocaleString('en-US', { timeZone: tz }));
  const utc = new Date(new Date(guess).toLocaleString('en-US', { timeZone: 'UTC' }));
  return guess + (utc.getTime() - local.getTime());
}

/** Days from today to the next given weekday (0 Sunday). Never today. */
function until(now: number, tz: string, weekday: number): number {
  const wd = new Date(new Date(now).toLocaleString('en-US', { timeZone: tz })).getDay();
  return ((weekday - wd + 7) % 7) || 7;
}

async function makeOrg(env: Env, userId: string, now: number, name: string, tz: string, skills: string[], extra: Dataset['extraFields'] = []) {
  const db = env.DB;
  const orgId = newId();
  const all = [...STARTER_FIELDS, ...extra];
  await db.batch([
    db.prepare('INSERT INTO orgs (id, name, time_zone, signup_url, created_at) VALUES (?, ?, ?, ?, ?)').bind(orgId, name, tz, 'https://example.com/join', now),
    db.prepare("INSERT INTO members (id, org_id, user_id, role, created_at) VALUES (?, ?, ?, 'admin', ?)").bind(newId(), orgId, userId, now),
    ...all.map((f, i) =>
      db.prepare('INSERT INTO fields (id, org_id, label, type, options_json, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(newId(), orgId, f.label, f.type, JSON.stringify(f.options), i, now),
    ),
  ]);
  const fields = await loadFields(db, orgId);
  const id = (label: string) => {
    const f = fields.find((x) => x.label === label);
    if (!f) throw new Error(`sample: no field ${label}`);
    return f.id;
  };
  await db.prepare('UPDATE fields SET options_json = ? WHERE id = ?').bind(JSON.stringify(skills), id('Skills')).run();
  return { orgId, id };
}

export async function createSampleOrg(env: Env, userId: string, now: number, kind: string): Promise<string> {
  const d = DATASETS[kind];
  if (!d) throw new Error(`sample: no dataset ${kind}`);
  const db = env.DB;
  const { orgId, id } = await makeOrg(env, userId, now, d.name, d.tz, d.skills, d.extraFields);
  await db.prepare('UPDATE orgs SET sample = 1, sample_kind = ? WHERE id = ?').bind(kind, orgId).run();
  const S: D1PreparedStatement[] = [];

  const settled = await ensureTags(db, orgId, d.tags.settled, 'sample', now - 30 * DAY);
  const fresh = await ensureTags(db, orgId, d.tags.fresh, 'model', now - 2 * HOUR);
  const tag = (name: string) => {
    const t = settled.get(name.toLowerCase()) ?? fresh.get(name.toLowerCase());
    if (!t) throw new Error(`sample: no tag ${name}`);
    return t.id;
  };

  const vid = new Map<string, string>();
  const vol = (name: string) => {
    const v = vid.get(name);
    if (!v) throw new Error(`sample: no person ${name}`);
    return v;
  };
  for (const p of d.people) {
    const v = newId();
    vid.set(p.name, v);
    const values: Record<string, unknown> = {
      [id('Skills')]: p.skills, [id('Experience')]: p.exp, [id('Age group')]: '18 or over',
      [id('Availability')]: p.days.map((x) => DAY_TEXT[x] ?? '').filter(Boolean)[0] ?? (p.remote ? 'Remote' : 'Any time'),
    };
    for (const [label, value] of Object.entries(p.extra ?? {})) values[id(label)] = value;
    let status = 'active';
    let pausedUntil: number | null = null;
    let pausedReason: string | null = null;
    let streak = 0;
    if (p.name === d.paused?.noAnswer) { status = 'paused'; pausedReason = 'no_answer'; streak = 3; }
    if (p.name === d.paused?.byChoice) { status = 'paused'; pausedReason = 'volunteer'; pausedUntil = now + 21 * DAY; }
    S.push(
      db.prepare(
        `INSERT INTO volunteers (id, org_id, name, email, phone, contact_ok_at, status, paused_until, paused_reason, values_json, last_asked_at, unanswered_streak,
          tier, hours_week, days_json, remote_ok, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        v, orgId, p.name, `${p.name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}.${kind}@example.com`, now - p.joined * DAY, status, pausedUntil, pausedReason,
        JSON.stringify(values), p.asked === undefined ? null : now - p.asked * DAY, streak, p.tier, p.hours, JSON.stringify(p.days), p.remote ? 1 : 0, now - p.joined * DAY, now,
      ),
    );
    S.push(...addTagStatements(db, orgId, 'volunteer', v, d.tagsFor(p).map(tag), now - p.joined * DAY));
  }
  for (const team of d.teams) {
    const teamId = newId();
    S.push(db.prepare('INSERT INTO teams (id, org_id, name, created_at) VALUES (?, ?, ?, ?)').bind(teamId, orgId, team.name, now - 60 * DAY));
    for (const p of d.people.filter(team.has)) {
      S.push(db.prepare('INSERT INTO team_members (team_id, volunteer_id, org_id) VALUES (?, ?, ?)').bind(teamId, vol(p.name), orgId));
    }
  }
  S.push(
    db.prepare(
      `INSERT INTO imports (id, org_id, file_name, file_type, column_map_json, added, merged, set_aside_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sample', ?)`,
    ).bind(newId(), orgId, d.import.fileName, d.import.fileName.split('.').pop() ?? 'csv', JSON.stringify({}), d.import.added, d.import.merged, JSON.stringify(d.import.setAside), now - 50 * DAY),
  );

  const ctx: Ctx = {
    now,
    at: (days, hour, minute) => at(now, d.tz, days, hour, minute),
    until: (weekday) => until(now, d.tz, weekday),
    req: (field, op, value) => ({ kind: 'field', fieldId: id(field), op, ...(value === undefined ? {} : { value }) }),
    tag,
    task(t) {
      const tid = newId();
      S.push(...addTagStatements(db, orgId, 'task', tid, (t.tags ?? []).map(tag), now - 10 * DAY));
      S.push(
        db.prepare(
          `INSERT INTO tasks (id, org_id, title, description, contact, timing, starts_at, ends_at, due_at, place_public, place_private, people_needed,
            requirements_json, ask_mode, next_round_at, status, publish, created_by, created_at, updated_at, need_id, remote, effort_minutes, bring, files_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'few', ?, ?, ?, 'sample', ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          tid, orgId, t.title, t.desc ?? '', t.contact ?? d.contact, t.start ? 'at_time' : t.due ? 'by_date' : 'none', t.start ?? null, t.end ?? null, t.due ?? null,
          t.place ?? '', t.address ?? '', t.people, JSON.stringify(t.reqs ?? []), t.nextRound ?? null, t.status, t.publish ? 1 : 0, now - 10 * DAY, now, t.need ?? null,
          t.remote ? 1 : 0, t.effort ?? null, t.bring ?? '', JSON.stringify(t.files ?? []),
        ),
      );
      return tid;
    },
    async ask(taskId, name, status, created, batch, spot) {
      const askId = newId();
      S.push(
        db.prepare(
          `INSERT INTO asks (id, org_id, task_id, volunteer_id, token_hash, status, created_at, expires_at, link_expires_at, answered_at, batch_no)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(askId, orgId, taskId, vol(name), await hashToken(env, newToken()), status, created, created + 2 * DAY, created + LINK_LIFETIME,
          ['yes', 'no'].includes(status) ? created + 3 * HOUR : null, batch),
      );
      if (spot) {
        S.push(db.prepare('INSERT INTO spots (id, org_id, task_id, volunteer_id, ask_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(newId(), orgId, taskId, vol(name), askId, spot, created + 3 * HOUR, now));
      }
    },
    need(n) {
      const nid = newId();
      S.push(db.prepare('INSERT INTO needs (id, org_id, title, starts_at, repeat, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(nid, orgId, n.title, n.startsAt, n.repeat ?? 'none', n.status, n.created, now));
      S.push(...addTagStatements(db, orgId, 'need', nid, (n.tags ?? []).map(tag), n.created));
      return nid;
    },
    item(needId, kind, title, detail, status = 'needed') {
      S.push(db.prepare('INSERT INTO need_items (id, org_id, need_id, kind, title, detail, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(newId(), orgId, needId, kind, title, detail, status, now));
    },
    report(taskId, name, body, created) {
      // The spot is the one this person holds on the task; the asks above created it.
      const spotId = newId();
      S.push(db.prepare(`INSERT INTO reports (id, org_id, spot_id, task_id, volunteer_id, body, created_at)
        SELECT ?, ?, s.id, ?, ?, ?, ? FROM spots s WHERE s.task_id = ? AND s.volunteer_id = ? LIMIT 1`)
        .bind(spotId, orgId, taskId, vol(name), body, created, taskId, vol(name)));
    },
  };
  await d.story(ctx);
  await db.batch(S);

  if (d.partner) {
    const partner = await makeOrg(env, userId, now, d.partner.name, d.tz, d.partner.skills);
    const P: D1PreparedStatement[] = d.partner.people.map(([name, sk]) =>
      db.prepare(
        `INSERT INTO volunteers (id, org_id, name, email, contact_ok_at, values_json, days_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?)`,
      ).bind(newId(), partner.orgId, name, `${name.split(' ')[0].toLowerCase()}.west@example.com`, now - 60 * DAY, JSON.stringify({ [partner.id('Skills')]: sk }), now - 60 * DAY, now),
    );
    P.push(
      db.prepare('INSERT INTO partners (org_id, partner_org_id, created_at) VALUES (?, ?, ?)').bind(orgId, partner.orgId, now),
      db.prepare('INSERT INTO partners (org_id, partner_org_id, created_at) VALUES (?, ?, ?)').bind(partner.orgId, orgId, now),
    );
    await db.batch(P);
  }
  return orgId;
}

export type { Person };

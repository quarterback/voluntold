// Sample data for trying the tool (dev mode only). Everything uses example.com
// addresses and made-up people. The story: Eastside Pantry has approved
// volunteers, some never offered anything; a new Saturday delivery service
// needs drivers, a dispatcher, containers and route notes; and Westside Pantry
// is a partner that can take open work.

import type { Env } from './env';
import { loadFields } from './db';
import { hashToken, newId, newToken } from './util';
import { STARTER_FIELDS } from './routes/org';
import { DAY, HOUR, LINK_LIFETIME } from '../shared/rules';

const TZ = 'America/Los_Angeles';

/** Milliseconds for a wall-clock time in the sample's time zone, `days` from today. */
function at(now: number, days: number, hour: number, minute = 0): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(now)).map((x) => [x.type, x.value]),
  );
  const guess = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + days, hour, minute);
  const local = new Date(new Date(guess).toLocaleString('en-US', { timeZone: TZ }));
  const utc = new Date(new Date(guess).toLocaleString('en-US', { timeZone: 'UTC' }));
  return guess + (utc.getTime() - local.getTime());
}

/** Days from today to the next given weekday (0 Sunday). Never today. */
function until(now: number, weekday: number): number {
  const wd = new Date(new Date(now).toLocaleString('en-US', { timeZone: TZ })).getDay();
  return ((weekday - wd + 7) % 7) || 7;
}

type P = { name: string; skills: string[]; exp: string; tier: string; days: string[]; hours: number | null; remote: boolean; joined: number; asked?: number };

// joined and asked are days ago. No "asked" means never asked.
const PEOPLE: P[] = [
  { name: 'Maya Ruiz', skills: ['Spanish', 'Writing'], exp: 'New', tier: 'one_time', days: ['sat_am'], hours: 1, remote: true, joined: 44 },
  { name: 'Ana Lindqvist', skills: ['Medicine'], exp: 'Has done it before', tier: 'one_time', days: ['tue_eve', 'wed_eve', 'thu_eve'], hours: 3, remote: true, joined: 44 },
  { name: 'Sam Tran', skills: ['Bookkeeping'], exp: 'Has done it before', tier: 'seasonal', days: ['sat_am', 'sun_pm'], hours: 2, remote: true, joined: 60, asked: 37 },
  { name: 'Jordan Kim', skills: ['Driving'], exp: 'Can lead', tier: 'regular', days: ['tue_pm', 'thu_pm', 'sat_am'], hours: 6, remote: false, joined: 120, asked: 3 },
  { name: 'Dev Okafor', skills: ['Cooking', 'Food safety'], exp: 'Can lead', tier: 'regular', days: ['sun_pm'], hours: 4, remote: false, joined: 90, asked: 23 },
  { name: 'Lee Park', skills: ['Design'], exp: 'Has done it before', tier: 'seasonal', days: [], hours: null, remote: true, joined: 200, asked: 40 },
  { name: 'Rae Morgan', skills: ['Driving'], exp: 'Has done it before', tier: 'regular', days: ['mon_pm', 'tue_pm', 'thu_pm'], hours: 4, remote: false, joined: 150, asked: 11 },
  { name: 'Priya Nair', skills: ['Spanish'], exp: 'Can lead', tier: 'core', days: ['sat_am'], hours: 8, remote: false, joined: 400, asked: 6 },
  { name: 'Omar Haddad', skills: ['Driving', 'Forklift'], exp: 'Can lead', tier: 'core', days: ['sat_am', 'thu_pm'], hours: 8, remote: false, joined: 380, asked: 2 },
  { name: 'Grace Mensah', skills: ['Writing'], exp: 'Can lead', tier: 'core', days: [], hours: 5, remote: true, joined: 500, asked: 9 },
  { name: 'Luis Ortega', skills: ['Driving'], exp: 'Has done it before', tier: 'regular', days: ['thu_pm', 'fri_pm'], hours: 4, remote: false, joined: 210, asked: 3 },
  { name: 'Hana Sato', skills: ['Design', 'Writing'], exp: 'New', tier: 'one_time', days: ['sun_am'], hours: 2, remote: true, joined: 30 },
  { name: 'Ben Carter', skills: ['Forklift'], exp: 'New', tier: 'one_time', days: ['sat_am'], hours: 3, remote: false, joined: 25 },
  { name: 'Zoe Martin', skills: ['Cooking'], exp: 'New', tier: 'seasonal', days: ['sat_am', 'sun_am'], hours: 3, remote: false, joined: 70, asked: 30 },
  { name: 'Kofi Asante', skills: ['Driving'], exp: 'Can lead', tier: 'regular', days: ['thu_pm'], hours: 3, remote: false, joined: 260, asked: 1 },
  { name: 'Ivy Chen', skills: ['Spanish', 'Writing'], exp: 'Has done it before', tier: 'seasonal', days: ['sat_am'], hours: 2, remote: true, joined: 95, asked: 16 },
  { name: 'Noah Fischer', skills: ['Bookkeeping'], exp: 'New', tier: 'one_time', days: [], hours: 1, remote: true, joined: 21 },
  { name: 'Tess Alvarez', skills: ['Driving', 'Spanish'], exp: 'Has done it before', tier: 'regular', days: ['sat_am', 'tue_pm', 'thu_pm'], hours: 4, remote: false, joined: 180, asked: 8 },
  { name: 'Marcus Webb', skills: ['Driving'], exp: 'New', tier: 'one_time', days: ['sun_pm', 'thu_pm'], hours: 2, remote: false, joined: 35 },
  { name: 'Elena Petrova', skills: ['Food safety', 'Cooking'], exp: 'Can lead', tier: 'core', days: ['sat_am', 'sun_pm'], hours: 6, remote: false, joined: 600, asked: 5 },
  { name: 'Theo Grant', skills: ['Writing'], exp: 'New', tier: 'one_time', days: [], hours: 2, remote: true, joined: 52 },
  { name: 'Aisha Bello', skills: ['Medicine', 'Spanish'], exp: 'Has done it before', tier: 'seasonal', days: ['sat_am'], hours: 3, remote: false, joined: 80, asked: 28 },
  { name: 'Caleb Ross', skills: ['Forklift', 'Driving'], exp: 'Has done it before', tier: 'regular', days: ['thu_pm', 'sat_am'], hours: 5, remote: false, joined: 140, asked: 2 },
  { name: 'Hugo Silva', skills: ['Driving'], exp: 'Has done it before', tier: 'regular', days: ['thu_pm', 'fri_pm'], hours: 4, remote: false, joined: 230, asked: 9 },
  { name: 'Lena Brooks', skills: ['Driving', 'Cooking'], exp: 'Has done it before', tier: 'seasonal', days: ['thu_pm', 'sun_pm'], hours: 3, remote: false, joined: 110, asked: 20 },
  { name: 'Nina Hoang', skills: ['Bookkeeping', 'Writing'], exp: 'Has done it before', tier: 'regular', days: ['wed_eve'], hours: 2, remote: true, joined: 160, asked: 19 },
];

const PARTNER: [string, string[]][] = [
  ['Rosa Diaz', ['Driving']], ['Will Turner', ['Driving']], ['Mei Lin', ['Spanish']], ['Pat Doyle', ['Driving', 'Forklift']],
  ['Sara Cohen', ['Cooking']], ['Abe Mills', ['Writing']], ['June Park', ['Driving']], ['Ola Nwosu', ['Food safety']],
];

async function makeOrg(env: Env, userId: string, now: number, name: string, skills: string[]) {
  const db = env.DB;
  const orgId = newId();
  await db.batch([
    db.prepare('INSERT INTO orgs (id, name, time_zone, signup_url, created_at) VALUES (?, ?, ?, ?, ?)').bind(orgId, name, TZ, 'https://example.com/join', now),
    db.prepare("INSERT INTO members (id, org_id, user_id, role, created_at) VALUES (?, ?, ?, 'admin', ?)").bind(newId(), orgId, userId, now),
    ...STARTER_FIELDS.map((f, i) =>
      db.prepare('INSERT INTO fields (id, org_id, label, type, options_json, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(newId(), orgId, f.label, f.type, JSON.stringify(f.options), i, now),
    ),
  ]);
  const fields = await loadFields(db, orgId);
  const id = (label: string) => fields.find((f) => f.label === label)!.id;
  await db.prepare('UPDATE fields SET options_json = ? WHERE id = ?').bind(JSON.stringify(skills), id('Skills')).run();
  return { orgId, id };
}

export async function createSampleOrg(env: Env, userId: string, now: number): Promise<string> {
  const db = env.DB;
  const skills = ['Bookkeeping', 'Cooking', 'Design', 'Driving', 'Food safety', 'Forklift', 'Medicine', 'Spanish', 'Writing'];
  const { orgId, id } = await makeOrg(env, userId, now, 'Sample: Eastside Pantry', skills);
  const S: D1PreparedStatement[] = [];
  const vid = new Map<string, string>();
  const DAYS_TEXT: Record<string, string> = { sat_am: 'Saturday mornings', sun_pm: 'Sunday afternoons', thu_pm: 'Thursday afternoons' };

  for (const p of PEOPLE) {
    const v = newId();
    vid.set(p.name, v);
    const values = { [id('Skills')]: p.skills, [id('Experience')]: p.exp, [id('Age group')]: '18 or over', [id('Availability')]: p.days.map((d) => DAYS_TEXT[d] ?? '').filter(Boolean)[0] ?? (p.remote ? 'Remote' : 'Any time') };
    let status = 'active';
    let pausedUntil: number | null = null;
    let pausedReason: string | null = null;
    let streak = 0;
    if (p.name === 'Rae Morgan') { status = 'paused'; pausedReason = 'no_answer'; streak = 3; }
    if (p.name === 'Lee Park') { status = 'paused'; pausedReason = 'volunteer'; pausedUntil = now + 21 * DAY; }
    S.push(
      db.prepare(
        `INSERT INTO volunteers (id, org_id, name, email, phone, contact_ok_at, status, paused_until, paused_reason, values_json, last_asked_at, unanswered_streak,
          tier, hours_week, days_json, remote_ok, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        v, orgId, p.name, `${p.name.split(' ')[0].toLowerCase()}@example.com`, now - p.joined * DAY, status, pausedUntil, pausedReason, JSON.stringify(values),
        p.asked === undefined ? null : now - p.asked * DAY, streak, p.tier, p.hours, JSON.stringify(p.days), p.remote ? 1 : 0, now - p.joined * DAY, now,
      ),
    );
  }
  const teamId = newId();
  S.push(db.prepare('INSERT INTO teams (id, org_id, name, created_at) VALUES (?, ?, ?, ?)').bind(teamId, orgId, 'Drivers', now));
  for (const p of PEOPLE.filter((x) => x.skills.includes('Driving'))) {
    S.push(db.prepare('INSERT INTO team_members (team_id, volunteer_id, org_id) VALUES (?, ?, ?)').bind(teamId, vid.get(p.name), orgId));
  }

  const task = (t: {
    title: string; desc?: string; contact?: string; start?: number; end?: number; due?: number; place?: string; address?: string; people: number;
    reqs?: unknown[]; status: string; need?: string | null; remote?: boolean; effort?: number; bring?: string; files?: { name: string; url: string }[];
    nextRound?: number | null;
  }) => {
    const tid = newId();
    S.push(
      db.prepare(
        `INSERT INTO tasks (id, org_id, title, description, contact, timing, starts_at, ends_at, due_at, place_public, place_private, people_needed,
          requirements_json, ask_mode, next_round_at, status, created_by, created_at, updated_at, need_id, remote, effort_minutes, bring, files_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'few', ?, ?, 'sample', ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        tid, orgId, t.title, t.desc ?? '', t.contact ?? 'Dana', t.start ? 'at_time' : t.due ? 'by_date' : 'none', t.start ?? null, t.end ?? null, t.due ?? null,
        t.place ?? '', t.address ?? '', t.people, JSON.stringify(t.reqs ?? []), t.nextRound ?? null, t.status, now - 10 * DAY, now, t.need ?? null,
        t.remote ? 1 : 0, t.effort ?? null, t.bring ?? '', JSON.stringify(t.files ?? []),
      ),
    );
    return tid;
  };
  const driving = { kind: 'field', fieldId: id('Skills'), op: 'includes', value: 'Driving' };
  const spanish = { kind: 'field', fieldId: id('Skills'), op: 'includes', value: 'Spanish' };

  // Asks and spots from the past and present. Each ask gets a real link token.
  const ask = async (taskId: string, name: string, status: string, created: number, batch: number, spot?: string) => {
    const askId = newId();
    S.push(
      db.prepare(
        `INSERT INTO asks (id, org_id, task_id, volunteer_id, token_hash, status, created_at, expires_at, link_expires_at, answered_at, batch_no)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(askId, orgId, taskId, vid.get(name), await hashToken(env, newToken()), status, created, created + 2 * DAY, created + LINK_LIFETIME,
        ['yes', 'no'].includes(status) ? created + 3 * HOUR : null, batch),
    );
    if (spot) {
      S.push(db.prepare('INSERT INTO spots (id, org_id, task_id, volunteer_id, ask_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(newId(), orgId, taskId, vid.get(name), askId, spot, created + 3 * HOUR, now));
    }
  };

  // Past work, so people have a history.
  const sortSep = task({ title: 'Sort donations', start: at(now, -30, 9), end: at(now, -30, 11), place: 'East Side branch', people: 4, status: 'done', bring: 'Closed-toe shoes' });
  for (const n of ['Sam Tran', 'Zoe Martin', 'Ivy Chen', 'Aisha Bello']) await ask(sortSep, n, 'yes', now - 37 * DAY, 1, 'done');
  const intakeSep = task({ title: 'Spanish intake desk', start: at(now, -16, 9), end: at(now, -16, 13), place: 'East Side branch', people: 2, reqs: [spanish], status: 'done' });
  for (const n of ['Ivy Chen', 'Tess Alvarez']) await ask(intakeSep, n, 'yes', now - 20 * DAY, 1, 'done');
  const cookOct = task({ title: 'Community dinner prep', start: at(now, -18, 13), end: at(now, -18, 17), place: 'Church kitchen', people: 3, status: 'done' });
  for (const n of ['Dev Okafor', 'Elena Petrova']) await ask(cookOct, n, 'yes', now - 23 * DAY, 1, 'done');
  await ask(cookOct, 'Zoe Martin', 'no', now - 23 * DAY, 1);
  const books = task({ title: 'Reconcile the donation log', due: at(now, -12, 17), people: 1, status: 'done', remote: true, effort: 90 });
  await ask(books, 'Nina Hoang', 'yes', now - 19 * DAY, 1, 'done');
  await ask(books, 'Sam Tran', 'no', now - 19 * DAY, 1);
  const drives = task({ title: 'Grocery rescue run', start: at(now, -11, 14), end: at(now, -11, 16), place: 'Fred Meyer, Hawthorne', people: 2, reqs: [driving], status: 'done' });
  for (const n of ['Jordan Kim', 'Luis Ortega']) await ask(drives, n, 'yes', now - 14 * DAY, 1, 'done');
  for (const n of ['Rae Morgan', 'Kofi Asante']) await ask(drives, n, 'expired', now - 14 * DAY, 1);

  // This week.
  const sat = until(now, 6);
  const dist = task({ title: 'Saturday distribution', start: at(now, sat, 9), end: at(now, sat, 13), place: 'East Side branch', people: 4, status: 'filled', bring: 'Closed-toe shoes' });
  for (const n of ['Priya Nair', 'Elena Petrova', 'Omar Haddad', 'Caleb Ross']) await ask(dist, n, 'yes', now - 6 * DAY, 1, 'holding');
  const desk = task({ title: 'Spanish intake desk', start: at(now, sat, 9), end: at(now, sat, 13), place: 'East Side branch', people: 2, reqs: [spanish], status: 'open', nextRound: now - HOUR });
  await ask(desk, 'Tess Alvarez', 'yes', now - 5 * DAY, 1, 'holding');
  await ask(desk, 'Aisha Bello', 'no', now - 5 * DAY, 1);

  // The driver who is still needed, two batches in.
  const thu = until(now, 4);
  const pickup = task({
    title: 'Donation pickups driver', desc: 'Pick up from three grocery partners and bring it back to the pantry.', start: at(now, thu, 16), end: at(now, thu, 18),
    place: 'East Side branch', address: '4410 SE Division St, side door', people: 2, reqs: [driving], status: 'open', bring: "Driver's license", nextRound: now + 2 * HOUR,
    files: [{ name: 'Pickup list', url: 'https://example.com/pickup-list.pdf' }],
  });
  await ask(pickup, 'Jordan Kim', 'yes', now - 3 * DAY, 1, 'holding');
  await ask(pickup, 'Kofi Asante', 'no', now - 3 * DAY, 1);
  await ask(pickup, 'Luis Ortega', 'no', now - 3 * DAY, 1);
  await ask(pickup, 'Rae Morgan', 'expired', now - 3 * DAY, 1);
  await ask(pickup, 'Omar Haddad', 'waiting', now - 6 * HOUR, 2);
  await ask(pickup, 'Caleb Ross', 'waiting', now - 6 * HOUR, 2);

  // A need: the new Saturday delivery service.
  const delivery = newId();
  const satNext = sat + 7;
  S.push(db.prepare("INSERT INTO needs (id, org_id, title, starts_at, repeat, status, created_at, updated_at) VALUES (?, ?, 'Saturday delivery', ?, 'weekly', 'draft', ?, ?)")
    .bind(delivery, orgId, at(now, satNext, 9), now - DAY, now));
  task({ title: 'Delivery driver', desc: 'Deliver boxes to 6 homes on the east side route.', start: at(now, satNext, 9), end: at(now, satNext, 11), place: 'East Side branch', people: 1, reqs: [driving], status: 'draft', need: delivery, bring: "Driver's license" });
  task({ title: 'Delivery driver', desc: 'Deliver boxes to 6 homes on the north route.', start: at(now, satNext, 13), end: at(now, satNext, 15), place: 'East Side branch', people: 1, reqs: [driving], status: 'draft', need: delivery, bring: "Driver's license" });
  task({ title: 'Dispatcher', desc: 'Answer driver calls and update the route sheet.', start: at(now, satNext, 9), end: at(now, satNext, 10, 30), people: 1, status: 'draft', need: delivery, remote: true, effort: 90 });
  S.push(
    db.prepare("INSERT INTO need_items (id, org_id, need_id, kind, title, detail, created_at) VALUES (?, ?, ?, 'supply', 'Food containers', '12 reusable', ?)").bind(newId(), orgId, delivery, now),
    db.prepare("INSERT INTO need_items (id, org_id, need_id, kind, title, detail, created_at) VALUES (?, ?, ?, 'info', 'Route instructions', 'Before the first Saturday', ?)").bind(newId(), orgId, delivery, now),
  );

  // A need with short remote work, so first offers have something to offer.
  const drive = newId();
  S.push(db.prepare("INSERT INTO needs (id, org_id, title, starts_at, repeat, status, created_at, updated_at) VALUES (?, ?, 'Fall food drive', ?, 'none', 'active', ?, ?)")
    .bind(drive, orgId, at(now, 5, 9), now - 3 * DAY, now));
  task({
    title: 'Check Spanish event instructions', desc: 'Read the Spanish instructions for the food drive and fix anything unclear.', due: at(now, 5, 17), people: 1,
    reqs: [spanish], status: 'open', need: drive, remote: true, effort: 60, files: [{ name: 'Instructions', url: 'https://example.com/instructions.docx' }],
  });
  task({ title: 'Proofread the flyer', desc: 'Check the food drive flyer for mistakes.', due: at(now, 4, 17), people: 2, status: 'open', need: drive, remote: true, effort: 30, files: [{ name: 'Flyer', url: 'https://example.com/flyer.pdf' }] });
  task({ title: 'Count the donation bins', desc: 'Count and log items in the lobby bins.', due: at(now, 6, 17), people: 1, status: 'open', need: drive, effort: 60, place: 'East Side branch' });
  S.push(db.prepare("INSERT INTO need_items (id, org_id, need_id, kind, title, detail, status, created_at) VALUES (?, ?, ?, 'supply', 'Collection bins', '4 bins', 'covered', ?)").bind(newId(), orgId, drive, now));

  await db.batch(S);

  // The partner, run by the same coordinator for the demo.
  const partner = await makeOrg(env, userId, now, 'Sample: Westside Pantry', ['Cooking', 'Driving', 'Food safety', 'Forklift', 'Spanish', 'Writing']);
  const P: D1PreparedStatement[] = PARTNER.map(([name, sk]) =>
    db.prepare(
      `INSERT INTO volunteers (id, org_id, name, email, contact_ok_at, values_json, days_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?)`,
    ).bind(newId(), partner.orgId, name, `${name.split(' ')[0].toLowerCase()}.west@example.com`, now - 60 * DAY, JSON.stringify({ [partner.id('Skills')]: sk }), now - 60 * DAY, now),
  );
  P.push(
    db.prepare('INSERT INTO partners (org_id, partner_org_id, created_at) VALUES (?, ?, ?)').bind(orgId, partner.orgId, now),
    db.prepare('INSERT INTO partners (org_id, partner_org_id, created_at) VALUES (?, ?, ?)').bind(partner.orgId, orgId, now),
  );
  await db.batch(P);
  return orgId;
}

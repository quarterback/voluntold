// Sample data for trying the tool (dev mode only). Everything is labeled
// as sample data and uses example.com addresses.

import type { Env } from './env';
import { loadFields } from './db';
import { newId } from './util';
import { STARTER_FIELDS } from './routes/org';
import { DAY, HOUR } from '../shared/rules';

const PEOPLE: [string, string[], string, string][] = [
  ['Alex Rivera', ['Communications'], 'Has done it before', 'Weekday evenings'],
  ['Sam Okafor', ['Design'], 'New', 'One afternoon a month'],
  ['Jordan Lee', ['Events'], 'Can lead', 'Weekends'],
  ['Ana Duarte', ['Medicine'], 'Can lead', 'Weekday evenings'],
  ['Rae Kim', ['Writing'], 'Has done it before', 'Mornings'],
  ['Lee Ward', ['Events', 'Writing'], 'Can lead', 'Any time'],
  ['Priya Nair', ['Design', 'Events'], 'Can lead', 'Weekends'],
  ['Tom Becker', ['Audio'], 'Has done it before', 'Evenings'],
  ['Maya Cohen', ['Writing'], 'New', 'Weekends'],
  ['Luis Ortega', ['Events'], 'Has done it before', 'Weekday daytime'],
  ['Grace Mensah', ['Communications', 'Writing'], 'Can lead', 'Evenings'],
  ['Omar Haddad', ['Audio', 'Events'], 'Can lead', 'Weekends'],
  ['Hana Sato', ['Design'], 'Has done it before', 'Any time'],
  ['Ben Carter', ['Events'], 'New', 'Saturdays'],
  ['Zoe Martin', ['Communications'], 'New', 'Evenings'],
  ['Kofi Asante', ['Events'], 'Can lead', 'Thursdays'],
  ['Ivy Chen', ['Writing', 'Design'], 'Has done it before', 'Weekends'],
  ['Noah Fischer', ['Audio'], 'New', 'Any time'],
];

export async function createSampleOrg(env: Env, userId: string, now: number): Promise<string> {
  const db = env.DB;
  const orgId = newId();
  await db.batch([
    db.prepare('INSERT INTO orgs (id, name, time_zone, signup_url, created_at) VALUES (?, ?, ?, ?, ?)').bind(orgId, 'Sample: Design chapter', 'America/New_York', 'https://example.com/join', now),
    db.prepare("INSERT INTO members (id, org_id, user_id, role, created_at) VALUES (?, ?, ?, 'admin', ?)").bind(newId(), orgId, userId, now),
    ...STARTER_FIELDS.map((f, i) =>
      db.prepare('INSERT INTO fields (id, org_id, label, type, options_json, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(newId(), orgId, f.label, f.type, JSON.stringify(f.options), i, now),
    ),
  ]);
  const fields = await loadFields(db, orgId);
  const id = (label: string) => fields.find((f) => f.label === label)!.id;
  await db.prepare('UPDATE fields SET options_json = ? WHERE id = ?').bind(JSON.stringify(['Audio', 'Communications', 'Design', 'Events', 'Medicine', 'Writing']), id('Skills')).run();

  const teamId = newId();
  const statements: D1PreparedStatement[] = [db.prepare('INSERT INTO teams (id, org_id, name, created_at) VALUES (?, ?, ?, ?)').bind(teamId, orgId, 'Desk crew', now)];
  PEOPLE.forEach(([name, skills, experience, availability], i) => {
    const vid = newId();
    const email = `${name.split(' ')[0].toLowerCase()}@example.com`;
    const values = { [id('Skills')]: skills, [id('Experience')]: experience, [id('Age group')]: '18 or over', [id('Availability')]: availability };
    // A few people were asked before, at different times, so the order by wait is visible.
    const lastAsked = i % 3 === 0 ? null : now - ((i * 5) % 60) * DAY;
    const paused = name === 'Lee Ward';
    statements.push(
      db
        .prepare(
          `INSERT INTO volunteers (id, org_id, name, email, phone, contact_ok_at, status, paused_until, paused_reason, values_json, last_asked_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(vid, orgId, name, email, now, paused ? 'paused' : 'active', paused ? now + 21 * DAY : null, paused ? 'volunteer' : null, JSON.stringify(values), lastAsked, now, now),
    );
    if (['Jordan Lee', 'Priya Nair', 'Omar Haddad', 'Kofi Asante', 'Grace Mensah'].includes(name)) {
      statements.push(db.prepare('INSERT INTO team_members (team_id, volunteer_id, org_id) VALUES (?, ?, ?)').bind(teamId, vid, orgId));
    }
  });
  const thursday = nextWeekday(now, 4);
  statements.push(
    db
      .prepare(
        `INSERT INTO tasks (id, org_id, team_id, title, description, contact, timing, starts_at, ends_at, place_public, place_private, people_needed,
          requirements_json, ask_mode, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, 'Registration desk', 'Greet people as they arrive and check them in on the tablet.', 'Ask for Priya at the front door.',
          'at_time', ?, ?, 'Downtown library', '120 Main St, Room 2', 2, ?, 'few', 'draft', 'sample', ?, ?)`,
      )
      .bind(newId(), orgId, teamId, thursday + 12 * HOUR, thursday + 14 * HOUR,
        JSON.stringify([{ kind: 'field', fieldId: id('Experience'), op: 'is', value: 'Can lead' }, { kind: 'team', teamId }]), now, now),
    db
      .prepare(
        `INSERT INTO tasks (id, org_id, title, description, timing, due_at, people_needed, requirements_json, ask_mode, status, created_by, created_at, updated_at)
         VALUES (?, ?, 'Check the event page', 'Read the lecture page and fix anything wrong or unclear. About 60 minutes.', 'by_date', ?, 1, ?, 'few', 'draft', 'sample', ?, ?)`,
      )
      .bind(newId(), orgId, thursday - DAY, JSON.stringify([{ kind: 'field', fieldId: id('Skills'), op: 'includes', value: 'Design' }]), now, now),
  );
  await db.batch(statements);
  return orgId;
}

function nextWeekday(now: number, weekday: number): number {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  const add = (weekday - d.getUTCDay() + 7) % 7 || 7;
  return d.getTime() + add * DAY + 4 * HOUR; // midnight in New York, roughly
}

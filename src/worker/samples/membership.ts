import { DAY, HOUR } from '../../shared/rules';
import type { Dataset, Person } from './common';

// The story: a professional association whose members staff its own events.
// The fall conference is two weeks out and short of room monitors; a new
// mentoring cohort is being set up; and the newsletter always needs copy.
const PEOPLE: Person[] = [
  { name: 'Alicia Moreno', skills: ['Facilitation', 'Mentoring'], exp: 'Can lead', tier: 'core', days: ['tue_eve', 'thu_eve'], hours: 6, remote: true, joined: 900, asked: 4 },
  { name: 'Ben Okoye', skills: ['Event setup', 'Photography'], exp: 'Has done it before', tier: 'regular', days: ['sat_am', 'sat_pm'], hours: 5, remote: false, joined: 420, asked: 12 },
  { name: 'Carla Nguyen', skills: ['Graphic design', 'Social media'], exp: 'Has done it before', tier: 'regular', days: [], hours: 3, remote: true, joined: 300, asked: 8 },
  { name: 'Dmitri Volkov', skills: ['Fundraising'], exp: 'Can lead', tier: 'core', days: ['wed_eve'], hours: 4, remote: true, joined: 1100, asked: 2 },
  { name: 'Esme Clark', skills: ['Writing'], exp: 'New', tier: 'one_time', days: [], hours: 2, remote: true, joined: 40 },
  { name: 'Farid Haddad', skills: ['Mentoring', 'Facilitation'], exp: 'Has done it before', tier: 'seasonal', days: ['mon_eve'], hours: 2, remote: true, joined: 250, asked: 45 },
  { name: 'Gwen Adebayo', skills: ['Event setup'], exp: 'New', tier: 'one_time', days: ['sat_am'], hours: 4, remote: false, joined: 33 },
  { name: 'Hiro Tanaka', skills: ['Photography', 'Social media'], exp: 'Has done it before', tier: 'regular', days: ['sat_pm', 'sun_pm'], hours: 3, remote: false, joined: 210, asked: 6 },
  { name: 'Imani Walker', skills: ['Mentoring'], exp: 'Can lead', tier: 'core', days: ['tue_eve'], hours: 3, remote: true, joined: 800, asked: 30 },
  { name: 'Jonas Berg', skills: ['Event setup', 'Fundraising'], exp: 'Has done it before', tier: 'seasonal', days: ['sat_am'], hours: 5, remote: false, joined: 180, asked: 14 },
  { name: 'Keiko Mori', skills: ['Writing', 'Graphic design'], exp: 'Has done it before', tier: 'regular', days: [], hours: 2, remote: true, joined: 360, asked: 21 },
  { name: 'Liam Doyle', skills: ['Facilitation'], exp: 'New', tier: 'one_time', days: ['thu_eve'], hours: 2, remote: true, joined: 28 },
  { name: 'Mina Rahimi', skills: ['Social media', 'Writing'], exp: 'New', tier: 'seasonal', days: [], hours: 2, remote: true, joined: 75, asked: 50 },
  { name: 'Nate Collins', skills: ['Event setup'], exp: 'Has done it before', tier: 'regular', days: ['fri_pm', 'sat_am'], hours: 6, remote: false, joined: 500, asked: 3 },
  { name: 'Olu Bankole', skills: ['Fundraising', 'Mentoring'], exp: 'Can lead', tier: 'core', days: ['wed_eve', 'thu_eve'], hours: 4, remote: true, joined: 700, asked: 1 },
  { name: 'Paula Reyes', skills: ['Photography'], exp: 'New', tier: 'one_time', days: ['sat_am'], hours: 3, remote: false, joined: 19 },
  { name: 'Quinn Foster', skills: ['Graphic design'], exp: 'Has done it before', tier: 'seasonal', days: [], hours: 2, remote: true, joined: 140, asked: 60 },
  { name: 'Rosa Kim', skills: ['Facilitation', 'Writing'], exp: 'Can lead', tier: 'regular', days: ['tue_eve'], hours: 3, remote: true, joined: 620, asked: 7 },
  { name: 'Sven Larsen', skills: ['Event setup', 'Photography'], exp: 'New', tier: 'one_time', days: ['sat_am', 'sat_pm'], hours: 4, remote: false, joined: 22 },
  { name: 'Tara Singh', skills: ['Mentoring'], exp: 'Has done it before', tier: 'regular', days: ['mon_eve', 'wed_eve'], hours: 2, remote: true, joined: 330, asked: 9 },
];

export const membership: Dataset = {
  kind: 'membership',
  name: 'Sample: Riverbend Design Alliance',
  tz: 'America/Chicago',
  skills: ['Event setup', 'Facilitation', 'Fundraising', 'Graphic design', 'Mentoring', 'Photography', 'Social media', 'Writing'],
  extraFields: [{ label: 'Chapter', type: 'one', options: ['North', 'South', 'Remote'] }],
  tags: { settled: ['Conference', 'Mentoring', 'Remote', 'Design', 'Fundraising'], fresh: ['conf crew', 'Newsletter'] },
  tagsFor(p) {
    const out: string[] = [];
    if (p.skills.includes('Event setup') || p.skills.includes('Photography')) out.push(['Sven Larsen', 'Gwen Adebayo'].includes(p.name) ? 'conf crew' : 'Conference');
    if (p.skills.includes('Mentoring') || p.skills.includes('Facilitation')) out.push('Mentoring');
    if (p.skills.includes('Graphic design')) out.push('Design');
    if (p.skills.includes('Fundraising')) out.push('Fundraising');
    if (p.skills.includes('Writing') || p.skills.includes('Social media')) out.push('Newsletter');
    if (p.remote) out.push('Remote');
    return out.slice(0, 3);
  },
  people: PEOPLE.map((p, i) => ({ ...p, extra: { Chapter: p.remote ? 'Remote' : i % 2 ? 'North' : 'South' } })),
  paused: { noAnswer: 'Farid Haddad', byChoice: 'Quinn Foster' },
  teams: [
    { name: 'Conference crew', has: (p) => p.skills.includes('Event setup') },
    { name: 'Mentors', has: (p) => p.skills.includes('Mentoring') },
  ],
  contact: 'Priya, membership director',
  import: {
    fileName: 'members-export.xlsx', added: 19, merged: 1,
    setAside: [{ row: 14, cells: { 'Full name': 'T. Osei', Email: '', Mobile: '' }, reason: 'No email or phone' }],
  },
  async story({ now, at, until, req, task, ask, need, item }) {
    const setup = req('Skills', 'includes', 'Event setup');
    const mentor = req('Skills', 'includes', 'Mentoring');
    const facil = req('Skills', 'includes', 'Facilitation');

    // Past work.
    const meeting = task({ title: 'Chapter meeting check-in', start: at(-27, 18), end: at(-27, 20), place: 'Riverbend Library, room B', people: 2, status: 'done', tags: ['Conference'] });
    for (const n of ['Ben Okoye', 'Nate Collins']) await ask(meeting, n, 'yes', now - 33 * DAY, 1, 'done');
    const orient = task({ title: 'Mentor orientation', start: at(-20, 18, 30), end: at(-20, 20), people: 2, reqs: [mentor], status: 'done', remote: true, tags: ['Mentoring', 'Remote'] });
    for (const n of ['Alicia Moreno', 'Imani Walker']) await ask(orient, n, 'yes', now - 25 * DAY, 1, 'done');
    await ask(orient, 'Farid Haddad', 'expired', now - 25 * DAY, 1);
    const news = task({ title: 'Copyedit the October newsletter', due: at(-15, 17), people: 1, status: 'done', remote: true, effort: 60, tags: ['Newsletter', 'Remote'] });
    await ask(news, 'Keiko Mori', 'yes', now - 19 * DAY, 1, 'done');
    const calls = task({ title: 'Sponsor follow-up calls', due: at(-9, 17), people: 2, reqs: [req('Skills', 'includes', 'Fundraising')], status: 'done', remote: true, effort: 90, tags: ['Fundraising', 'Remote'] });
    for (const n of ['Dmitri Volkov', 'Olu Bankole']) await ask(calls, n, 'yes', now - 13 * DAY, 1, 'done');
    await ask(calls, 'Jonas Berg', 'no', now - 13 * DAY, 1);
    const photo = task({ title: 'Photograph the panel night', start: at(-6, 18), end: at(-6, 21), place: 'Union Hall', people: 1, reqs: [req('Skills', 'includes', 'Photography')], status: 'done', tags: ['Conference'] });
    await ask(photo, 'Hiro Tanaka', 'yes', now - 10 * DAY, 1, 'done');

    // The conference, 12 days out.
    const conf = need({ title: 'Fall conference', startsAt: at(12, 8), status: 'active', created: now - 20 * DAY, tags: ['Conference'] });
    const reg = task({ title: 'Registration desk', desc: 'Check people in and hand out badges.', start: at(12, 7, 30), end: at(12, 10), place: 'Convention Center, north lobby', address: 'Door 4, staff entrance', people: 3, reqs: [], status: 'filled', need: conf, tags: ['Conference'], publish: true });
    for (const n of ['Nate Collins', 'Ben Okoye', 'Jonas Berg']) await ask(reg, n, 'yes', now - 8 * DAY, 1, 'holding');
    const rooms = task({ title: 'Session room monitors', desc: 'Keep sessions on time and count the room.', start: at(12, 10), end: at(12, 16), place: 'Convention Center', people: 4, reqs: [setup], status: 'open', need: conf, nextRound: now - 2 * HOUR, tags: ['Conference'], publish: true });
    await ask(rooms, 'Gwen Adebayo', 'yes', now - 4 * DAY, 1, 'holding');
    await ask(rooms, 'Sven Larsen', 'no', now - 4 * DAY, 1);
    await ask(rooms, 'Paula Reyes', 'expired', now - 4 * DAY, 1);
    task({ title: 'Signage setup', desc: 'Place the wayfinding signs the night before.', start: at(11, 17), end: at(11, 19), place: 'Convention Center', people: 2, reqs: [setup], status: 'open', need: conf, tags: ['Conference'] });
    task({ title: 'Post the speaker lineup', desc: 'Three posts over the week before the conference.', due: at(5, 17), people: 1, reqs: [req('Skills', 'includes', 'Social media')], status: 'open', need: conf, remote: true, effort: 45, tags: ['Newsletter', 'Remote'] });
    item(conf, 'supply', 'Badge printer', 'Borrow from the North chapter');
    item(conf, 'supply', 'Signage', '24 signs, printed', 'covered');
    item(conf, 'info', 'Room list', 'From the venue by Friday');

    // A new mentoring cohort, still a draft.
    const cohort = need({ title: 'Spring mentoring cohort', startsAt: at(45, 18), repeat: 'monthly', status: 'draft', created: now - 2 * DAY, tags: ['Mentoring'] });
    task({ title: 'Mentor', desc: 'One mentee, one call a month for six months.', start: at(45, 18), end: at(45, 19), people: 6, reqs: [mentor], status: 'draft', need: cohort, remote: true, tags: ['Mentoring', 'Remote'] });
    task({ title: 'Match mentees to mentors', desc: 'Read the 14 applications and propose pairs.', due: at(30, 17), people: 1, reqs: [facil], status: 'draft', need: cohort, remote: true, effort: 120, tags: ['Mentoring', 'Remote'] });
    item(cohort, 'info', 'Mentee applications', '14 received, 6 more expected');

    // Standing remote work for first offers.
    task({ title: 'Welcome calls to new members', desc: 'Call the eight people who joined this month.', due: at(7, 17), people: 2, status: 'open', remote: true, effort: 60, tags: ['Remote'] });
    task({ title: 'Proofread the November newsletter', due: at(9, 17), people: 1, status: 'open', remote: true, effort: 45, tags: ['Newsletter', 'Remote'] });
  },
};

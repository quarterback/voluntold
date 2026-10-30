import { DAY, HOUR } from '../../shared/rules';
import type { Dataset, Person } from './common';

// The story: a youth nonprofit where a cleared background check decides who
// can be asked. Thursday tutoring is short, a museum trip needs chaperones,
// and winter camp is being planned.
const PEOPLE: Person[] = [
  { name: 'Amara Osei', skills: ['Tutoring: reading', 'Spanish'], exp: 'Can lead', tier: 'core', days: ['tue_pm', 'thu_pm'], hours: 5, remote: false, joined: 800, asked: 3, extra: { 'Background check': 'Cleared' } },
  { name: 'Bea Thornton', skills: ['Coaching'], exp: 'Has done it before', tier: 'regular', days: ['sat_am'], hours: 3, remote: false, joined: 300, asked: 9, extra: { 'Background check': 'Cleared' } },
  { name: 'Cal Jensen', skills: ['Tutoring: math'], exp: 'New', tier: 'one_time', days: ['thu_pm'], hours: 2, remote: false, joined: 24, extra: { 'Background check': 'Pending' } },
  { name: 'Dara Mensah', skills: ['Art', 'Tutoring: reading'], exp: 'Has done it before', tier: 'regular', days: ['wed_pm', 'thu_pm'], hours: 4, remote: false, joined: 420, asked: 12, extra: { 'Background check': 'Cleared' } },
  { name: 'Eli Brandt', skills: ['Driving: van', 'First aid'], exp: 'Can lead', tier: 'core', days: ['sat_am', 'sat_pm'], hours: 6, remote: false, joined: 1000, asked: 2, extra: { 'Background check': 'Cleared' } },
  { name: 'Fatima Noor', skills: ['Tutoring: math', 'Tutoring: reading'], exp: 'Can lead', tier: 'regular', days: ['tue_pm', 'thu_pm'], hours: 4, remote: false, joined: 600, asked: 6, extra: { 'Background check': 'Cleared' } },
  { name: 'Gabe Ruiz', skills: ['Coaching', 'First aid'], exp: 'Has done it before', tier: 'seasonal', days: ['sat_am'], hours: 3, remote: false, joined: 200, asked: 35, extra: { 'Background check': 'Cleared' } },
  { name: 'Hope Adler', skills: ['Cooking'], exp: 'New', tier: 'one_time', days: ['wed_pm'], hours: 2, remote: false, joined: 18, extra: { 'Background check': 'Not started' } },
  { name: 'Ike Nwachukwu', skills: ['Tutoring: math'], exp: 'Has done it before', tier: 'regular', days: ['thu_pm'], hours: 2, remote: false, joined: 350, asked: 8, extra: { 'Background check': 'Cleared' } },
  { name: 'Jade Park', skills: ['Art'], exp: 'New', tier: 'seasonal', days: ['sat_pm'], hours: 3, remote: false, joined: 70, asked: 44, extra: { 'Background check': 'Cleared' } },
  { name: 'Kenji Sato', skills: ['Coaching', 'Driving: van'], exp: 'Has done it before', tier: 'regular', days: ['sat_am'], hours: 4, remote: false, joined: 500, asked: 4, extra: { 'Background check': 'Cleared' } },
  { name: 'Lila Haddad', skills: ['Tutoring: reading', 'Spanish'], exp: 'New', tier: 'one_time', days: ['tue_pm'], hours: 2, remote: false, joined: 40, extra: { 'Background check': 'Pending' } },
  { name: 'Mo Farouk', skills: ['Cooking', 'First aid'], exp: 'Has done it before', tier: 'regular', days: ['wed_pm', 'sat_am'], hours: 4, remote: false, joined: 280, asked: 15, extra: { 'Background check': 'Cleared' } },
  { name: 'Nia Campbell', skills: ['Art', 'Tutoring: reading'], exp: 'Can lead', tier: 'core', days: ['tue_pm', 'wed_pm', 'thu_pm'], hours: 6, remote: false, joined: 900, asked: 1, extra: { 'Background check': 'Cleared' } },
  { name: 'Oscar Lindqvist', skills: ['Tutoring: math'], exp: 'New', tier: 'one_time', days: ['thu_pm'], hours: 2, remote: false, joined: 33, extra: { 'Background check': 'Cleared' } },
  { name: 'Pia Romero', skills: ['Coaching'], exp: 'New', tier: 'seasonal', days: ['sat_am'], hours: 3, remote: false, joined: 90, asked: 60, extra: { 'Background check': 'Cleared' } },
  { name: 'Ravi Patel', skills: ['Driving: van', 'Cooking'], exp: 'Has done it before', tier: 'regular', days: ['sat_am', 'sat_pm'], hours: 5, remote: false, joined: 460, asked: 7, extra: { 'Background check': 'Cleared' } },
  { name: 'Sol Marin', skills: ['Tutoring: reading'], exp: 'Has done it before', tier: 'seasonal', days: ['tue_pm'], hours: 2, remote: false, joined: 150, asked: 29, extra: { 'Background check': 'Cleared' } },
  { name: 'Tomas Weber', skills: ['Art', 'Cooking'], exp: 'New', tier: 'one_time', days: ['wed_pm'], hours: 2, remote: false, joined: 27, extra: { 'Background check': 'Not started' } },
];

export const youth: Dataset = {
  kind: 'youth',
  name: 'Sample: Northgate Youth Collective',
  tz: 'America/Denver',
  skills: ['Art', 'Coaching', 'Cooking', 'Driving: van', 'First aid', 'Spanish', 'Tutoring: math', 'Tutoring: reading'],
  extraFields: [{ label: 'Background check', type: 'one', options: ['Cleared', 'Pending', 'Not started'] }],
  tags: { settled: ['Tutoring', 'Soccer', 'Field trips', 'Kitchen', 'Art'], fresh: ['tutors', 'Camp'] },
  tagsFor(p) {
    const out: string[] = [];
    if (p.skills.some((s) => s.startsWith('Tutoring'))) out.push(['Cal Jensen', 'Oscar Lindqvist'].includes(p.name) ? 'tutors' : 'Tutoring');
    if (p.skills.includes('Coaching')) out.push('Soccer');
    if (p.skills.includes('Driving: van') || p.skills.includes('First aid')) out.push('Field trips');
    if (p.skills.includes('Cooking')) out.push('Kitchen');
    if (p.skills.includes('Art')) out.push('Art');
    if (p.tier === 'core') out.push('Camp');
    return out.slice(0, 3);
  },
  people: PEOPLE,
  paused: { noAnswer: 'Pia Romero', byChoice: 'Jade Park' },
  teams: [
    { name: 'Tutors', has: (p) => p.skills.some((s) => s.startsWith('Tutoring')) && p.extra?.['Background check'] === 'Cleared' },
    { name: 'Camp staff', has: (p) => p.tier === 'core' },
  ],
  contact: 'Ms. Reyes, program director',
  import: {
    fileName: 'volunteer-applications.pdf', added: 18, merged: 1,
    setAside: [{ row: 12, cells: { Name: 'Parent of Devon M.', Email: '', Phone: '' }, reason: 'No email or phone' }],
  },
  async story({ now, at, until, req, task, ask, need, item, report }) {
    const cleared = req('Background check', 'is', 'Cleared');
    const reading = req('Skills', 'includes', 'Tutoring: reading');
    const math = req('Skills', 'includes', 'Tutoring: math');
    const van = req('Skills', 'includes', 'Driving: van');
    const coach = req('Skills', 'includes', 'Coaching');

    // Past sessions.
    const tut1 = task({ title: 'After-school tutoring, Tuesday', start: at(-29, 15, 30), end: at(-29, 17), place: 'Northgate center, room 2', people: 3, reqs: [cleared], status: 'done', tags: ['Tutoring'] });
    for (const n of ['Amara Osei', 'Fatima Noor', 'Sol Marin']) await ask(tut1, n, 'yes', now - 34 * DAY, 1, 'done');
    const trip = task({ title: 'Chaperone, zoo field trip', start: at(-20, 9), end: at(-20, 14), place: 'Northgate center, then the zoo', people: 4, reqs: [cleared], status: 'done', bring: 'Lunch', tags: ['Field trips'] });
    for (const n of ['Eli Brandt', 'Kenji Sato', 'Mo Farouk']) await ask(trip, n, 'yes', now - 26 * DAY, 1, 'done');
    await ask(trip, 'Gabe Ruiz', 'yes', now - 26 * DAY, 1, 'missed');
    const snack = task({ title: 'Snack prep, Wednesday', start: at(-13, 14, 30), end: at(-13, 15, 30), place: 'Northgate center kitchen', people: 2, reqs: [cleared], status: 'done', tags: ['Kitchen'] });
    for (const n of ['Mo Farouk', 'Ravi Patel']) await ask(snack, n, 'yes', now - 17 * DAY, 1, 'done');
    const art = task({ title: 'Saturday art workshop', start: at(-8, 13), end: at(-8, 15), place: 'Northgate center, room 1', people: 2, reqs: [cleared, req('Skills', 'includes', 'Art')], status: 'done', tags: ['Art'] });
    for (const n of ['Nia Campbell', 'Dara Mensah']) await ask(art, n, 'yes', now - 12 * DAY, 1, 'done');
    await ask(art, 'Jade Park', 'expired', now - 12 * DAY, 1);

    // This week.
    const sat = until(6);
    const thu = until(4);
    const soccer = task({ title: 'Saturday soccer coach', desc: 'Run drills and a scrimmage for the 9 to 11 group.', start: at(sat, 9), end: at(sat, 11), place: 'Lincoln Park field 3', people: 2, reqs: [cleared, coach], status: 'filled', bring: 'Cleats and a whistle', tags: ['Soccer'], publish: true });
    for (const n of ['Bea Thornton', 'Kenji Sato']) await ask(soccer, n, 'yes', now - 6 * DAY, 1, 'holding');
    report(soccer, 'Bea Thornton', 'Field 3 is double-booked with a league game at 9. Can we move to field 1?', now - 4 * HOUR);
    const thursday = task({ title: 'Reading tutors, Thursday', desc: 'One-on-one reading with second and third graders.', start: at(thu, 15, 30), end: at(thu, 17), place: 'Northgate center, room 2', people: 4, reqs: [cleared, reading], status: 'open', nextRound: now - HOUR, tags: ['Tutoring'] });
    await ask(thursday, 'Amara Osei', 'yes', now - 4 * DAY, 1, 'holding');
    await ask(thursday, 'Nia Campbell', 'yes', now - 4 * DAY, 1, 'holding');
    await ask(thursday, 'Sol Marin', 'no', now - 4 * DAY, 1);
    const museum = task({
      title: 'Chaperones, science museum trip', desc: 'Ride the van, stay with your group of five, eat lunch with them.', start: at(sat + 7, 9), end: at(sat + 7, 15),
      place: 'Northgate center, then the museum', address: 'Vans leave from the back lot', people: 5, reqs: [cleared], status: 'open', bring: 'Lunch', nextRound: now + 4 * HOUR, tags: ['Field trips'], publish: true,
    });
    await ask(museum, 'Eli Brandt', 'yes', now - 3 * DAY, 1, 'holding');
    await ask(museum, 'Ravi Patel', 'yes', now - 3 * DAY, 1, 'holding');
    await ask(museum, 'Gabe Ruiz', 'no', now - 3 * DAY, 1);
    await ask(museum, 'Pia Romero', 'expired', now - 3 * DAY, 1);
    await ask(museum, 'Mo Farouk', 'waiting', now - 5 * HOUR, 2);
    await ask(museum, 'Dara Mensah', 'waiting', now - 5 * HOUR, 2);

    // Winter camp, still a draft, with gaps that need a van driver.
    const camp = need({ title: 'Winter break camp', startsAt: at(55, 8), status: 'draft', created: now - 2 * DAY, tags: ['Camp'] });
    task({ title: 'Camp counselor, week 1', desc: 'Lead a group of eight all week.', start: at(55, 8), end: at(55, 16), place: 'Northgate center', people: 4, reqs: [cleared], status: 'draft', need: camp, tags: ['Camp'] });
    task({ title: 'Van driver, camp week 1', desc: 'Morning pickup and afternoon drop-off.', start: at(55, 7), end: at(55, 9), place: 'Northgate center', people: 1, reqs: [cleared, van], status: 'draft', need: camp, bring: "Driver's license", tags: ['Field trips'] });
    task({ title: 'Lunch crew, camp week 1', start: at(55, 11), end: at(55, 13), place: 'Northgate center kitchen', people: 2, reqs: [cleared, req('Skills', 'includes', 'Cooking')], status: 'draft', need: camp, tags: ['Kitchen'] });
    item(camp, 'supply', 'First aid kits', '2 kits, restocked');
    item(camp, 'info', 'Permission slips', 'Due from families by the 15th');
    item(camp, 'supply', 'Van', 'Reserved', 'covered');

    // Tutoring term, active, with remote work for first offers.
    const term = need({ title: 'Fall tutoring term', startsAt: at(-40, 15), repeat: 'weekly', status: 'active', created: now - 45 * DAY, tags: ['Tutoring'] });
    task({ title: 'Math tutors, Tuesday', start: at(thu - 2 + 7, 15, 30), end: at(thu - 2 + 7, 17), place: 'Northgate center, room 2', people: 3, reqs: [cleared, math], status: 'open', need: term, tags: ['Tutoring'] });
    task({ title: 'Grade the practice sheets', desc: 'About 30 sheets, answer key attached.', due: at(5, 17), people: 1, status: 'open', need: term, remote: true, effort: 45, files: [{ name: 'Answer key', url: 'https://example.com/answer-key.pdf' }], tags: ['Tutoring'] });
    task({ title: 'Translate the parent letter', desc: 'One page, English to Spanish.', due: at(6, 17), people: 1, reqs: [req('Skills', 'includes', 'Spanish')], status: 'open', need: term, remote: true, effort: 30, tags: ['Tutoring'] });
    item(term, 'supply', 'Workbooks', '40 reading, 40 math', 'covered');
  },
};

import { DAY, HOUR } from '../../shared/rules';
import type { Dataset, Person } from './common';

// The story: Eastside Pantry has approved volunteers, some never offered
// anything; a new Saturday delivery service needs drivers, a dispatcher,
// containers and route notes; and Westside Pantry is a partner that can take
// open work.
const PEOPLE: Person[] = [
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

export const pantry: Dataset = {
  kind: 'pantry',
  name: 'Sample: Eastside Pantry',
  tz: 'America/Los_Angeles',
  skills: ['Bookkeeping', 'Cooking', 'Design', 'Driving', 'Food safety', 'Forklift', 'Medicine', 'Spanish', 'Writing'],
  tags: { settled: ['Driving', 'Kitchen', 'Spanish', 'Remote', 'Writing', 'Events'], fresh: ['kitchen help', 'Office'] },
  tagsFor(p) {
    const out: string[] = [];
    if (p.skills.includes('Driving')) out.push('Driving');
    if (p.skills.includes('Spanish')) out.push('Spanish');
    if (p.skills.includes('Cooking') || p.skills.includes('Food safety')) out.push(['Zoe Martin', 'Lena Brooks'].includes(p.name) ? 'kitchen help' : 'Kitchen');
    if (p.skills.includes('Writing') || p.skills.includes('Design')) out.push('Writing');
    if (p.skills.includes('Bookkeeping')) out.push('Office');
    if (p.remote) out.push('Remote');
    return out.slice(0, 3);
  },
  people: PEOPLE,
  paused: { noAnswer: 'Rae Morgan', byChoice: 'Lee Park' },
  teams: [{ name: 'Drivers', has: (p) => p.skills.includes('Driving') }],
  contact: 'Dana',
  import: {
    fileName: 'volunteers.csv', added: 24, merged: 1,
    setAside: [{ row: 19, cells: { Name: 'R. Delgado', Email: '', Phone: '' }, reason: 'No email or phone' }],
  },
  async story({ now, at, until, req, task, ask, need, item }) {
    const driving = req('Skills', 'includes', 'Driving');
    const spanish = req('Skills', 'includes', 'Spanish');

    // Past work, so people have a history.
    const sortSep = task({ title: 'Sort donations', start: at(-30, 9), end: at(-30, 11), place: 'East Side branch', people: 4, status: 'done', bring: 'Closed-toe shoes', tags: ['Events'] });
    for (const n of ['Sam Tran', 'Zoe Martin', 'Ivy Chen', 'Aisha Bello']) await ask(sortSep, n, 'yes', now - 37 * DAY, 1, 'done');
    const intakeSep = task({ title: 'Spanish intake desk', start: at(-16, 9), end: at(-16, 13), place: 'East Side branch', people: 2, reqs: [spanish], status: 'done', tags: ['Spanish'] });
    for (const n of ['Ivy Chen', 'Tess Alvarez']) await ask(intakeSep, n, 'yes', now - 20 * DAY, 1, 'done');
    const cookOct = task({ title: 'Community dinner prep', start: at(-18, 13), end: at(-18, 17), place: 'Church kitchen', people: 3, status: 'done', tags: ['Kitchen'] });
    for (const n of ['Dev Okafor', 'Elena Petrova']) await ask(cookOct, n, 'yes', now - 23 * DAY, 1, 'done');
    await ask(cookOct, 'Zoe Martin', 'no', now - 23 * DAY, 1);
    const books = task({ title: 'Reconcile the donation log', due: at(-12, 17), people: 1, status: 'done', remote: true, effort: 90, tags: ['Remote', 'Office'] });
    await ask(books, 'Nina Hoang', 'yes', now - 19 * DAY, 1, 'done');
    await ask(books, 'Sam Tran', 'no', now - 19 * DAY, 1);
    const drives = task({ title: 'Grocery rescue run', start: at(-11, 14), end: at(-11, 16), place: 'Fred Meyer, Hawthorne', people: 2, reqs: [driving], status: 'done', tags: ['Driving'] });
    for (const n of ['Jordan Kim', 'Luis Ortega']) await ask(drives, n, 'yes', now - 14 * DAY, 1, 'done');
    for (const n of ['Rae Morgan', 'Kofi Asante']) await ask(drives, n, 'expired', now - 14 * DAY, 1);

    // This week.
    const sat = until(6);
    const dist = task({ title: 'Saturday distribution', start: at(sat, 9), end: at(sat, 13), place: 'East Side branch', people: 4, status: 'filled', bring: 'Closed-toe shoes', tags: ['Events'], publish: true });
    for (const n of ['Priya Nair', 'Elena Petrova', 'Omar Haddad', 'Caleb Ross']) await ask(dist, n, 'yes', now - 6 * DAY, 1, 'holding');
    const desk = task({ title: 'Spanish intake desk', start: at(sat, 9), end: at(sat, 13), place: 'East Side branch', people: 2, reqs: [spanish], status: 'open', nextRound: now - HOUR, tags: ['Spanish'] });
    await ask(desk, 'Tess Alvarez', 'yes', now - 5 * DAY, 1, 'holding');
    await ask(desk, 'Aisha Bello', 'no', now - 5 * DAY, 1);

    // The driver who is still needed, two batches in.
    const thu = until(4);
    const pickup = task({
      title: 'Donation pickups driver', desc: 'Pick up from three grocery partners and bring it back to the pantry.', start: at(thu, 16), end: at(thu, 18),
      place: 'East Side branch', address: '4410 SE Division St, side door', people: 2, reqs: [driving], status: 'open', bring: "Driver's license", nextRound: now + 2 * HOUR,
      files: [{ name: 'Pickup list', url: 'https://example.com/pickup-list.pdf' }], tags: ['Driving'],
    });
    await ask(pickup, 'Jordan Kim', 'yes', now - 3 * DAY, 1, 'holding');
    await ask(pickup, 'Kofi Asante', 'no', now - 3 * DAY, 1);
    await ask(pickup, 'Luis Ortega', 'no', now - 3 * DAY, 1);
    await ask(pickup, 'Rae Morgan', 'expired', now - 3 * DAY, 1);
    await ask(pickup, 'Omar Haddad', 'waiting', now - 6 * HOUR, 2);
    await ask(pickup, 'Caleb Ross', 'waiting', now - 6 * HOUR, 2);

    // A need: the new Saturday delivery service.
    const satNext = sat + 7;
    const delivery = need({ title: 'Saturday delivery', startsAt: at(satNext, 9), repeat: 'weekly', status: 'draft', created: now - DAY, tags: ['Driving'] });
    task({ title: 'Delivery driver', desc: 'Deliver boxes to 6 homes on the east side route.', start: at(satNext, 9), end: at(satNext, 11), place: 'East Side branch', people: 1, reqs: [driving], status: 'draft', need: delivery, bring: "Driver's license", tags: ['Driving'] });
    task({ title: 'Delivery driver', desc: 'Deliver boxes to 6 homes on the north route.', start: at(satNext, 13), end: at(satNext, 15), place: 'East Side branch', people: 1, reqs: [driving], status: 'draft', need: delivery, bring: "Driver's license", tags: ['Driving'] });
    task({ title: 'Dispatcher', desc: 'Answer driver calls and update the route sheet.', start: at(satNext, 9), end: at(satNext, 10, 30), people: 1, status: 'draft', need: delivery, remote: true, effort: 90, tags: ['Remote'] });
    item(delivery, 'supply', 'Food containers', '12 reusable');
    item(delivery, 'info', 'Route instructions', 'Before the first Saturday');

    // A need with short remote work, so first offers have something to offer.
    const drive = need({ title: 'Fall food drive', startsAt: at(5, 9), status: 'active', created: now - 3 * DAY, tags: ['Events', 'Remote'] });
    task({
      title: 'Check Spanish event instructions', desc: 'Read the Spanish instructions for the food drive and fix anything unclear.', due: at(5, 17), people: 1,
      reqs: [spanish], status: 'open', need: drive, remote: true, effort: 60, files: [{ name: 'Instructions', url: 'https://example.com/instructions.docx' }], tags: ['Spanish', 'Remote'],
    });
    task({ title: 'Proofread the flyer', desc: 'Check the food drive flyer for mistakes.', due: at(4, 17), people: 2, status: 'open', need: drive, remote: true, effort: 30, files: [{ name: 'Flyer', url: 'https://example.com/flyer.pdf' }], tags: ['Writing', 'Remote'] });
    task({ title: 'Count the donation bins', desc: 'Count and log items in the lobby bins.', due: at(6, 17), people: 1, status: 'open', need: drive, effort: 60, place: 'East Side branch', tags: ['Events'] });
    item(drive, 'supply', 'Collection bins', '4 bins', 'covered');
  },
  partner: {
    name: 'Sample: Westside Pantry',
    skills: ['Cooking', 'Driving', 'Food safety', 'Forklift', 'Spanish', 'Writing'],
    people: [
      ['Rosa Diaz', ['Driving']], ['Will Turner', ['Driving']], ['Mei Lin', ['Spanish']], ['Pat Doyle', ['Driving', 'Forklift']],
      ['Sara Cohen', ['Cooking']], ['Abe Mills', ['Writing']], ['June Park', ['Driving']], ['Ola Nwosu', ['Food safety']],
    ],
  },
};

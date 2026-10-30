import { DAY, HOUR } from '../../shared/rules';
import type { Dataset, Person } from './common';

// The story: a company that staffs festivals, races and conferences with a
// volunteer crew. The River Festival is next weekend and the gate is short;
// the beer garden needs certified people; load-out is covered.
const PEOPLE: Person[] = [
  { name: 'Avery Lane', skills: ['Registration', 'Crowd flow'], exp: 'Can lead', tier: 'core', days: ['sat_am', 'sat_pm', 'sun_am'], hours: 10, remote: false, joined: 800, asked: 2, extra: { Certification: ['First aid'] } },
  { name: 'Bao Tran', skills: ['Setup and strike', 'Driving'], exp: 'Has done it before', tier: 'regular', days: ['fri_pm', 'sun_eve'], hours: 8, remote: false, joined: 420, asked: 6, extra: { Certification: ['Forklift'] } },
  { name: 'Celia Ortiz', skills: ['Bar'], exp: 'Has done it before', tier: 'regular', days: ['sat_pm', 'sat_eve'], hours: 6, remote: false, joined: 300, asked: 9, extra: { Certification: ['Alcohol service'] } },
  { name: 'Dion Baptiste', skills: ['Crowd flow', 'First aid'], exp: 'Has done it before', tier: 'regular', days: ['sat_am', 'sat_pm'], hours: 8, remote: false, joined: 500, asked: 4, extra: { Certification: ['First aid'] } },
  { name: 'Elif Demir', skills: ['Registration'], exp: 'New', tier: 'one_time', days: ['sat_am'], hours: 4, remote: false, joined: 23, extra: { Certification: [] } },
  { name: 'Fox Mulligan', skills: ['Photography', 'Merch'], exp: 'Has done it before', tier: 'seasonal', days: ['sat_pm', 'sun_pm'], hours: 5, remote: false, joined: 200, asked: 70, extra: { Certification: [] } },
  { name: 'Gia Romano', skills: ['Bar', 'Merch'], exp: 'Can lead', tier: 'core', days: ['fri_eve', 'sat_eve'], hours: 8, remote: false, joined: 900, asked: 3, extra: { Certification: ['Alcohol service'] } },
  { name: 'Hugo Lind', skills: ['Setup and strike'], exp: 'New', tier: 'one_time', days: ['fri_pm', 'sat_am'], hours: 6, remote: false, joined: 30, extra: { Certification: [] } },
  { name: 'Isla McBride', skills: ['Registration', 'Merch'], exp: 'Has done it before', tier: 'regular', days: ['sat_am', 'sun_am'], hours: 6, remote: false, joined: 380, asked: 12, extra: { Certification: [] } },
  { name: 'Jovan Petrov', skills: ['Crowd flow', 'Driving'], exp: 'Has done it before', tier: 'regular', days: ['sat_am', 'sat_pm', 'sun_am'], hours: 10, remote: false, joined: 600, asked: 1, extra: { Certification: ['First aid'] } },
  { name: 'Kym Osei', skills: ['Bar'], exp: 'New', tier: 'seasonal', days: ['sat_eve'], hours: 5, remote: false, joined: 60, asked: 40, extra: { Certification: ['Alcohol service'] } },
  { name: 'Lars Nyberg', skills: ['Setup and strike', 'Driving'], exp: 'Can lead', tier: 'core', days: ['fri_pm', 'sun_eve'], hours: 10, remote: false, joined: 1200, asked: 5, extra: { Certification: ['Forklift', 'First aid'] } },
  { name: 'Mika Ahn', skills: ['Photography'], exp: 'Has done it before', tier: 'seasonal', days: ['sat_pm'], hours: 4, remote: false, joined: 150, asked: 25, extra: { Certification: [] } },
  { name: 'Nadia Kowalski', skills: ['Registration', 'Crowd flow'], exp: 'New', tier: 'one_time', days: ['sat_am'], hours: 5, remote: false, joined: 19, extra: { Certification: [] } },
  { name: 'Omar Siddiqui', skills: ['Crowd flow'], exp: 'Has done it before', tier: 'regular', days: ['sat_pm', 'sun_pm'], hours: 6, remote: false, joined: 450, asked: 8, extra: { Certification: ['First aid'] } },
  { name: 'Pilar Vega', skills: ['Merch', 'Registration'], exp: 'Has done it before', tier: 'regular', days: ['sat_am', 'sat_pm'], hours: 8, remote: false, joined: 330, asked: 15, extra: { Certification: [] } },
  { name: 'Reid Cooper', skills: ['Setup and strike'], exp: 'Has done it before', tier: 'regular', days: ['fri_pm', 'sat_am', 'sun_eve'], hours: 9, remote: false, joined: 520, asked: 7, extra: { Certification: ['Forklift'] } },
  { name: 'Suki Yamamoto', skills: ['Bar', 'Crowd flow'], exp: 'Has done it before', tier: 'seasonal', days: ['sat_eve'], hours: 5, remote: false, joined: 180, asked: 58, extra: { Certification: ['Alcohol service'] } },
  { name: 'Tariq Bell', skills: ['Driving', 'Setup and strike'], exp: 'New', tier: 'one_time', days: ['fri_pm'], hours: 4, remote: false, joined: 27, extra: { Certification: [] } },
  { name: 'Vera Lindqvist', skills: ['Registration'], exp: 'Can lead', tier: 'core', days: ['sat_am', 'sun_am'], hours: 8, remote: false, joined: 1000, asked: 3, extra: { Certification: ['First aid'] } },
];

export const events: Dataset = {
  kind: 'events',
  name: 'Sample: Bright Line Event Crew',
  tz: 'America/New_York',
  skills: ['Bar', 'Crowd flow', 'Driving', 'First aid', 'Merch', 'Photography', 'Registration', 'Setup and strike'],
  extraFields: [{ label: 'Certification', type: 'many', options: ['Alcohol service', 'First aid', 'Forklift'] }],
  tags: { settled: ['Gate', 'Bar', 'Setup', 'Crowd', 'Merch'], fresh: ['gate crew', 'Photo'] },
  tagsFor(p) {
    const out: string[] = [];
    if (p.skills.includes('Registration')) out.push(['Elif Demir', 'Nadia Kowalski'].includes(p.name) ? 'gate crew' : 'Gate');
    if (p.skills.includes('Bar')) out.push('Bar');
    if (p.skills.includes('Setup and strike')) out.push('Setup');
    if (p.skills.includes('Crowd flow')) out.push('Crowd');
    if (p.skills.includes('Merch')) out.push('Merch');
    if (p.skills.includes('Photography')) out.push('Photo');
    return out.slice(0, 3);
  },
  people: PEOPLE,
  paused: { noAnswer: 'Fox Mulligan', byChoice: 'Suki Yamamoto' },
  teams: [
    { name: 'Gate crew', has: (p) => p.skills.includes('Registration') || p.skills.includes('Crowd flow') },
    { name: 'Setup crew', has: (p) => p.skills.includes('Setup and strike') },
  ],
  contact: 'Crew lead at the staff tent',
  import: {
    fileName: 'crew-signups.csv', added: 20, merged: 2,
    setAside: [{ row: 11, cells: { Name: 'Crew (TBD)', Email: '', Phone: '' }, reason: 'No email or phone' }],
  },
  async story({ now, at, until, req, task, ask, need, item }) {
    const alcohol = req('Certification', 'includes', 'Alcohol service');
    const forklift = req('Certification', 'includes', 'Forklift');
    const reg = req('Skills', 'includes', 'Registration');
    const crowd = req('Skills', 'includes', 'Crowd flow');
    const setup = req('Skills', 'includes', 'Setup and strike');

    // Past events.
    const water = task({ title: 'Harvest Run: water station 3', start: at(-35, 7), end: at(-35, 11), place: 'Mile 6, Riverside Drive', people: 4, status: 'done', bring: 'Hat and sunscreen', tags: ['Crowd'] });
    for (const n of ['Dion Baptiste', 'Omar Siddiqui', 'Jovan Petrov', 'Mika Ahn']) await ask(water, n, 'yes', now - 40 * DAY, 1, 'done');
    const packets = task({ title: 'Harvest Run: packet pickup', start: at(-36, 12), end: at(-36, 18), place: 'Expo hall, booth 12', people: 3, reqs: [reg], status: 'done', tags: ['Gate'] });
    for (const n of ['Vera Lindqvist', 'Isla McBride', 'Pilar Vega']) await ask(packets, n, 'yes', now - 41 * DAY, 1, 'done');
    const fair = task({ title: 'Street fair setup', start: at(-21, 6), end: at(-21, 10), place: 'Main St at 4th', people: 6, reqs: [setup], status: 'done', bring: 'Work gloves', tags: ['Setup'] });
    for (const n of ['Lars Nyberg', 'Reid Cooper', 'Bao Tran']) await ask(fair, n, 'yes', now - 25 * DAY, 1, 'done');
    await ask(fair, 'Hugo Lind', 'expired', now - 25 * DAY, 1);
    const badges = task({ title: 'Tech conference: badge desk', start: at(-12, 7), end: at(-12, 12), place: 'Hotel ballroom foyer', people: 4, reqs: [reg], status: 'done', tags: ['Gate'] });
    for (const n of ['Avery Lane', 'Vera Lindqvist', 'Isla McBride']) await ask(badges, n, 'yes', now - 16 * DAY, 1, 'done');
    await ask(badges, 'Pilar Vega', 'no', now - 16 * DAY, 1);

    // The River Festival, next weekend.
    const sat = until(6) + 7;
    const fest = need({ title: 'River Festival', startsAt: at(sat, 8), status: 'active', created: now - 25 * DAY, tags: ['Gate', 'Bar', 'Setup'] });
    const gate = task({
      title: 'River Festival: gate check, Saturday', desc: 'Scan tickets and wristband people at the north and south gates.', start: at(sat, 9), end: at(sat, 15),
      place: 'Riverfront Park, north gate', address: 'Staff tent behind the main stage', people: 10, reqs: [reg], status: 'open', need: fest, bring: 'Comfortable shoes', nextRound: now - HOUR, tags: ['Gate'], publish: true,
    });
    for (const n of ['Avery Lane', 'Vera Lindqvist', 'Isla McBride', 'Pilar Vega']) await ask(gate, n, 'yes', now - 5 * DAY, 1, 'holding');
    await ask(gate, 'Elif Demir', 'waiting', now - 5 * DAY, 1);
    await ask(gate, 'Nadia Kowalski', 'no', now - 5 * DAY, 1);
    const garden = task({ title: 'River Festival: beer garden', desc: 'Pour and check IDs. Alcohol service certification required.', start: at(sat, 12), end: at(sat, 20), place: 'Riverfront Park, beer garden', people: 6, reqs: [alcohol], status: 'open', need: fest, nextRound: now + 2 * HOUR, tags: ['Bar'], publish: true });
    for (const n of ['Gia Romano', 'Celia Ortiz']) await ask(garden, n, 'yes', now - 4 * DAY, 1, 'holding');
    await ask(garden, 'Kym Osei', 'waiting', now - 8 * HOUR, 2);
    await ask(garden, 'Suki Yamamoto', 'expired', now - 4 * DAY, 1);
    const strike = task({ title: 'River Festival: load-out, Sunday', start: at(sat + 1, 18), end: at(sat + 1, 23), place: 'Riverfront Park, main stage', people: 4, reqs: [setup], status: 'filled', need: fest, tags: ['Setup'] });
    for (const n of ['Lars Nyberg', 'Reid Cooper', 'Bao Tran', 'Tariq Bell']) await ask(strike, n, 'yes', now - 6 * DAY, 1, 'holding');
    task({ title: 'River Festival: forklift, load-in Friday', start: at(sat - 1, 8), end: at(sat - 1, 14), place: 'Riverfront Park, main stage', people: 1, reqs: [forklift], status: 'open', need: fest, tags: ['Setup'] });
    task({ title: 'River Festival: crowd flow, main stage', start: at(sat, 15), end: at(sat, 22), place: 'Riverfront Park, main stage', people: 6, reqs: [crowd], status: 'open', need: fest, tags: ['Crowd'] });
    item(fest, 'supply', 'Radios', '20 handhelds, charged', 'covered');
    item(fest, 'supply', 'Crew vests', '40 vests, 12 missing from the last event');
    item(fest, 'info', 'Gate schedule', 'From the festival director Thursday');

    // The winter market, still a draft.
    const market = need({ title: 'Winter market', startsAt: at(40, 10), repeat: 'weekly', status: 'draft', created: now - DAY, tags: ['Gate', 'Merch'] });
    task({ title: 'Market entrance', start: at(40, 10), end: at(40, 16), place: 'Civic Plaza', people: 2, reqs: [reg], status: 'draft', need: market, tags: ['Gate'] });
    task({ title: 'Merch tent', start: at(40, 10), end: at(40, 16), place: 'Civic Plaza', people: 2, reqs: [req('Skills', 'includes', 'Merch')], status: 'draft', need: market, tags: ['Merch'] });
    item(market, 'info', 'Vendor count', 'Waiting on the plaza office');

    // Standing short work.
    task({ title: 'Sort the festival photos', desc: 'Pick 40 from about 600 for the recap.', due: at(sat + 5, 17), people: 1, reqs: [req('Skills', 'includes', 'Photography')], status: 'open', remote: true, effort: 90, tags: ['Photo'] });
    task({ title: 'Count the merch inventory', start: at(3, 10), end: at(3, 12), place: 'Warehouse', people: 2, status: 'open', effort: 120, tags: ['Merch'] });
  },
};

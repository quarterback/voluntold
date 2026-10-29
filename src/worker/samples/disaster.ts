import { DAY, HOUR } from '../../shared/rules';
import type { Dataset, Person } from './common';

// The story: a company that mobilizes a trained pool within hours. A windstorm
// cleanup needs 12 people by Saturday, a shelter desk is covered, and the
// standby roster for storm season is being set up.
const PEOPLE: Person[] = [
  { name: 'Ana Castillo', skills: ['CERT trained', 'Spanish', 'Shelter operations'], exp: 'Can lead', tier: 'core', days: ['sat_am', 'sat_pm', 'sun_am'], hours: 10, remote: false, joined: 1100, asked: 2, extra: { 'Deployment radius': 'Statewide' } },
  { name: 'Boris Melnyk', skills: ['Chainsaw', 'Driving: truck'], exp: 'Can lead', tier: 'core', days: ['sat_am', 'sun_am'], hours: 8, remote: false, joined: 900, asked: 5, extra: { 'Deployment radius': 'Up to 2 hours' } },
  { name: 'Cora Whitfield', skills: ['First aid', 'Shelter operations'], exp: 'Has done it before', tier: 'regular', days: ['fri_eve', 'sat_am'], hours: 6, remote: false, joined: 400, asked: 9, extra: { 'Deployment radius': 'Local only' } },
  { name: 'Dev Raman', skills: ['Ham radio', 'Logistics'], exp: 'Has done it before', tier: 'regular', days: [], hours: 4, remote: true, joined: 520, asked: 14, extra: { 'Deployment radius': 'Local only' } },
  { name: 'Ella Fontaine', skills: ['CERT trained', 'First aid'], exp: 'Has done it before', tier: 'seasonal', days: ['sat_am'], hours: 4, remote: false, joined: 210, asked: 48, extra: { 'Deployment radius': 'Up to 2 hours' } },
  { name: 'Finn Gallagher', skills: ['Chainsaw'], exp: 'New', tier: 'one_time', days: ['sat_am', 'sat_pm'], hours: 6, remote: false, joined: 20, extra: { 'Deployment radius': 'Local only' } },
  { name: 'Gloria Mbeki', skills: ['Logistics', 'Spanish'], exp: 'Can lead', tier: 'core', days: ['sat_am', 'sun_pm'], hours: 8, remote: false, joined: 1300, asked: 1, extra: { 'Deployment radius': 'Statewide' } },
  { name: 'Hank Dorsey', skills: ['Driving: truck', 'Chainsaw'], exp: 'Has done it before', tier: 'regular', days: ['sat_am'], hours: 6, remote: false, joined: 600, asked: 7, extra: { 'Deployment radius': 'Up to 2 hours' } },
  { name: 'Ingrid Solberg', skills: ['Shelter operations'], exp: 'New', tier: 'one_time', days: ['fri_eve'], hours: 4, remote: false, joined: 35, extra: { 'Deployment radius': 'Local only' } },
  { name: 'Jalen Brooks', skills: ['CERT trained', 'Driving: truck'], exp: 'Has done it before', tier: 'regular', days: ['sat_am', 'sat_pm'], hours: 8, remote: false, joined: 350, asked: 3, extra: { 'Deployment radius': 'Statewide' } },
  { name: 'Karin Vos', skills: ['First aid'], exp: 'New', tier: 'seasonal', days: ['sun_am'], hours: 3, remote: false, joined: 80, asked: 52, extra: { 'Deployment radius': 'Local only' } },
  { name: 'Luca Ferri', skills: ['Logistics', 'Ham radio'], exp: 'Has done it before', tier: 'regular', days: [], hours: 3, remote: true, joined: 470, asked: 11, extra: { 'Deployment radius': 'Local only' } },
  { name: 'Maren Holt', skills: ['CERT trained', 'Shelter operations', 'First aid'], exp: 'Can lead', tier: 'core', days: ['fri_eve', 'sat_am', 'sun_am'], hours: 12, remote: false, joined: 1500, asked: 4, extra: { 'Deployment radius': 'Statewide' } },
  { name: 'Nassim Haddad', skills: ['Chainsaw', 'Driving: truck'], exp: 'New', tier: 'one_time', days: ['sat_am'], hours: 5, remote: false, joined: 26, extra: { 'Deployment radius': 'Up to 2 hours' } },
  { name: 'Opal Reed', skills: ['Shelter operations', 'Spanish'], exp: 'Has done it before', tier: 'regular', days: ['fri_eve', 'sat_eve'], hours: 6, remote: false, joined: 300, asked: 16, extra: { 'Deployment radius': 'Local only' } },
  { name: 'Pete Lindholm', skills: ['Ham radio'], exp: 'Has done it before', tier: 'seasonal', days: [], hours: 2, remote: true, joined: 240, asked: 33, extra: { 'Deployment radius': 'Local only' } },
  { name: 'Rhea Kapoor', skills: ['First aid', 'CERT trained'], exp: 'New', tier: 'one_time', days: ['sat_am'], hours: 4, remote: false, joined: 22, extra: { 'Deployment radius': 'Local only' } },
  { name: 'Sam Oyelaran', skills: ['Driving: truck', 'Logistics'], exp: 'Can lead', tier: 'regular', days: ['sat_am', 'sun_am'], hours: 8, remote: false, joined: 700, asked: 6, extra: { 'Deployment radius': 'Statewide' } },
  { name: 'Tove Eriksen', skills: ['Chainsaw', 'First aid'], exp: 'Has done it before', tier: 'regular', days: ['sat_am', 'sat_pm'], hours: 6, remote: false, joined: 380, asked: 8, extra: { 'Deployment radius': 'Up to 2 hours' } },
  { name: 'Uri Shapiro', skills: ['Logistics'], exp: 'New', tier: 'one_time', days: [], hours: 2, remote: true, joined: 31, extra: { 'Deployment radius': 'Local only' } },
];

export const disaster: Dataset = {
  kind: 'disaster',
  name: 'Sample: Cascade Surge Response',
  tz: 'America/Los_Angeles',
  skills: ['CERT trained', 'Chainsaw', 'Driving: truck', 'First aid', 'Ham radio', 'Logistics', 'Shelter operations', 'Spanish'],
  extraFields: [{ label: 'Deployment radius', type: 'one', options: ['Local only', 'Up to 2 hours', 'Statewide'] }],
  tags: { settled: ['Field', 'Shelter', 'Radio', 'Logistics', 'Spanish'], fresh: ['field crew', 'Medical'] },
  tagsFor(p) {
    const out: string[] = [];
    if (p.skills.includes('Chainsaw') || p.skills.includes('Driving: truck')) out.push(['Finn Gallagher', 'Nassim Haddad'].includes(p.name) ? 'field crew' : 'Field');
    if (p.skills.includes('Shelter operations')) out.push('Shelter');
    if (p.skills.includes('Ham radio')) out.push('Radio');
    if (p.skills.includes('Logistics')) out.push('Logistics');
    if (p.skills.includes('First aid')) out.push('Medical');
    if (p.skills.includes('Spanish')) out.push('Spanish');
    return out.slice(0, 3);
  },
  people: PEOPLE,
  paused: { noAnswer: 'Karin Vos', byChoice: 'Ella Fontaine' },
  teams: [
    { name: 'Strike team A', has: (p) => p.skills.includes('Chainsaw') || p.skills.includes('Driving: truck') },
    { name: 'Shelter crew', has: (p) => p.skills.includes('Shelter operations') },
  ],
  contact: 'Ops desk, 555-0140',
  import: {
    fileName: 'cert-graduates-2026.csv', added: 20, merged: 1,
    setAside: [{ row: 6, cells: { Name: 'J. Alvarez', Email: '', Phone: '' }, reason: 'No email or phone' }],
  },
  async story({ now, at, until, req, task, ask, need, item, report }) {
    const cert = req('Skills', 'includes', 'CERT trained');
    const saw = req('Skills', 'includes', 'Chainsaw');
    const truck = req('Skills', 'includes', 'Driving: truck');
    const shelter = req('Skills', 'includes', 'Shelter operations');
    const radio = req('Skills', 'includes', 'Ham radio');
    const statewide = req('Deployment radius', 'is', 'Statewide');

    // Past deployments.
    const flood = task({ title: 'Mill Creek flood: sandbag line', start: at(-40, 7), end: at(-40, 15), place: 'Mill Creek levee, staging lot', people: 20, reqs: [cert], status: 'done', bring: 'Boots, gloves, water', tags: ['Field'] });
    for (const n of ['Ana Castillo', 'Jalen Brooks', 'Maren Holt', 'Ella Fontaine', 'Tove Eriksen', 'Rhea Kapoor']) await ask(flood, n, 'yes', now - 41 * DAY, 1, 'done');
    await ask(flood, 'Karin Vos', 'expired', now - 41 * DAY, 1);
    const night = task({ title: 'Shelter overnight shift', start: at(-39, 22), end: at(-38, 6), place: 'Westside Community Center', people: 3, reqs: [shelter], status: 'done', tags: ['Shelter'] });
    for (const n of ['Maren Holt', 'Cora Whitfield', 'Opal Reed']) await ask(night, n, 'yes', now - 40 * DAY, 1, 'done');
    const supply = task({ title: 'Supply truck run to the levee', start: at(-39, 6), end: at(-39, 10), place: 'Warehouse, bay 2', people: 2, reqs: [truck], status: 'done', tags: ['Field', 'Logistics'] });
    for (const n of ['Boris Melnyk', 'Hank Dorsey']) await ask(supply, n, 'yes', now - 40 * DAY, 1, 'done');
    const debris = task({ title: 'Debris cut, Pine Road', start: at(-18, 8), end: at(-18, 14), place: 'Pine Road at mile 4', people: 6, reqs: [saw], status: 'done', bring: 'Chaps, helmet, saw', tags: ['Field'] });
    for (const n of ['Boris Melnyk', 'Hank Dorsey', 'Tove Eriksen']) await ask(debris, n, 'yes', now - 20 * DAY, 1, 'done');
    await ask(debris, 'Nassim Haddad', 'yes', now - 20 * DAY, 1, 'missed');
    const net = task({ title: 'Weekly radio net check', due: at(-7, 20), people: 2, reqs: [radio], status: 'done', remote: true, effort: 30, tags: ['Radio'] });
    for (const n of ['Dev Raman', 'Pete Lindholm']) await ask(net, n, 'yes', now - 9 * DAY, 1, 'done');

    // The surge: a windstorm cleanup this Saturday, three batches in.
    const sat = until(6);
    const storm = need({ title: 'Windstorm cleanup', startsAt: at(sat, 7), status: 'active', created: now - 2 * DAY, tags: ['Field'] });
    const cleanup = task({
      title: 'Windstorm cleanup, Saturday', desc: 'Clear downed limbs from 30 blocks in the Alder district. Crews of four, one saw per crew.', start: at(sat, 7), end: at(sat, 15),
      place: 'Alder district staging, Lot C', address: '1200 NE Alder St, enter from 12th', people: 12, reqs: [cert], status: 'open', need: storm, bring: 'Boots, gloves, water, a lunch', nextRound: now + HOUR, tags: ['Field'], publish: true,
    });
    for (const n of ['Ana Castillo', 'Jalen Brooks', 'Maren Holt', 'Tove Eriksen', 'Boris Melnyk']) await ask(cleanup, n, 'yes', now - 2 * DAY, 1, 'holding');
    await ask(cleanup, 'Ella Fontaine', 'no', now - 2 * DAY, 1);
    await ask(cleanup, 'Hank Dorsey', 'yes', now - DAY, 2, 'holding');
    await ask(cleanup, 'Sam Oyelaran', 'yes', now - DAY, 2, 'holding');
    await ask(cleanup, 'Rhea Kapoor', 'waiting', now - 6 * HOUR, 3);
    await ask(cleanup, 'Karin Vos', 'expired', now - 2 * DAY, 1);
    report(cleanup, 'Jalen Brooks', 'Lot C is closed by the city until Saturday noon. Need a new staging point.', now - 3 * HOUR);
    const desk = task({ title: 'Shelter intake desk, Friday night', start: at(sat - 1, 18), end: at(sat - 1, 23), place: 'Westside Community Center', people: 2, reqs: [shelter], status: 'filled', need: storm, tags: ['Shelter'] });
    for (const n of ['Cora Whitfield', 'Opal Reed']) await ask(desk, n, 'yes', now - 2 * DAY, 1, 'holding');
    task({ title: 'Truck driver, debris haul', start: at(sat, 8), end: at(sat, 15), place: 'Alder district staging, Lot C', people: 3, reqs: [truck], status: 'open', need: storm, bring: 'Driver\'s license', tags: ['Field', 'Logistics'] });
    task({ title: 'Radio relay, cleanup day', start: at(sat, 7), end: at(sat, 15), people: 1, reqs: [radio], status: 'open', need: storm, remote: true, tags: ['Radio'] });
    item(storm, 'supply', 'Saws', '3 crews, 3 saws, fuel');
    item(storm, 'supply', 'Dump truck', 'Rented through Monday', 'covered');
    item(storm, 'info', 'Staging point', 'Lot C closed until noon, per the city');

    // Storm season standby, a draft roster for the next call.
    const standby = need({ title: 'Storm season standby', startsAt: at(14, 6), repeat: 'monthly', status: 'draft', created: now - 5 * DAY, tags: ['Field', 'Shelter'] });
    task({ title: 'Statewide strike team', desc: 'Deploy within four hours of a call, anywhere in the state, for up to three days.', start: at(14, 6), end: at(16, 18), people: 8, reqs: [cert, statewide], status: 'draft', need: standby, tags: ['Field'] });
    task({ title: 'Shelter lead on call', desc: 'Open a shelter within two hours of a call.', start: at(14, 6), end: at(14, 18), people: 2, reqs: [shelter], status: 'draft', need: standby, tags: ['Shelter'] });
    task({ title: 'Radio net on call', start: at(14, 6), end: at(14, 18), people: 2, reqs: [radio], status: 'draft', need: standby, remote: true, tags: ['Radio'] });
    item(standby, 'supply', 'Generators', '4 serviced', 'covered');
    item(standby, 'supply', 'Fuel cards', '6 cards, two expired');

    // Standing remote work for first offers.
    task({ title: 'Update the Spanish intake form', due: at(6, 17), people: 1, reqs: [req('Skills', 'includes', 'Spanish')], status: 'open', remote: true, effort: 45, tags: ['Spanish', 'Shelter'] });
    task({ title: 'Inventory the warehouse, bay 2', start: at(sat + 1, 10), end: at(sat + 1, 12), place: 'Warehouse, bay 2', people: 2, reqs: [], status: 'open', effort: 120, tags: ['Logistics'] });
  },
};

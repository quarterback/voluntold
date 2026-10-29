import { DAY, HOUR } from '../../shared/rules';
import type { Dataset, Person } from './common';

// The story: an all-volunteer station. Board operators cover the schedule,
// the fall pledge drive needs phones answered, and a new show is being set up.
const PEOPLE: Person[] = [
  { name: 'Ada Lindgren', skills: ['On-air hosting', 'Board operation'], exp: 'Can lead', tier: 'core', days: ['sat_am'], hours: 4, remote: false, joined: 1500, asked: 3, extra: { 'Board trained': 'yes' } },
  { name: 'Bram Visser', skills: ['Engineering'], exp: 'Can lead', tier: 'core', days: ['sun_am', 'wed_eve'], hours: 5, remote: false, joined: 2000, asked: 10, extra: { 'Board trained': 'yes' } },
  { name: 'Cleo Marsh', skills: ['Music library', 'Writing'], exp: 'Has done it before', tier: 'regular', days: ['tue_pm'], hours: 3, remote: true, joined: 400, asked: 15, extra: { 'Board trained': 'no' } },
  { name: 'Dante Ruiz', skills: ['Board operation'], exp: 'Has done it before', tier: 'regular', days: ['sat_eve', 'sun_eve'], hours: 6, remote: false, joined: 310, asked: 2, extra: { 'Board trained': 'yes' } },
  { name: 'Erin Walsh', skills: ['Fundraising', 'Writing'], exp: 'Has done it before', tier: 'seasonal', days: ['thu_eve'], hours: 2, remote: true, joined: 260, asked: 40, extra: { 'Board trained': 'no' } },
  { name: 'Femi Adeyemi', skills: ['On-air hosting'], exp: 'New', tier: 'one_time', days: ['fri_eve'], hours: 2, remote: false, joined: 30, extra: { 'Board trained': 'no' } },
  { name: 'Greta Holm', skills: ['Audio editing', 'Music library'], exp: 'Has done it before', tier: 'regular', days: [], hours: 3, remote: true, joined: 520, asked: 8, extra: { 'Board trained': 'no' } },
  { name: 'Hal Okonkwo', skills: ['Board operation', 'Audio editing'], exp: 'Can lead', tier: 'core', days: ['mon_eve', 'tue_eve', 'wed_eve'], hours: 8, remote: false, joined: 900, asked: 1, extra: { 'Board trained': 'yes' } },
  { name: 'Iris Chen', skills: ['Web', 'Writing'], exp: 'Has done it before', tier: 'regular', days: [], hours: 2, remote: true, joined: 350, asked: 22, extra: { 'Board trained': 'no' } },
  { name: 'Jamal Price', skills: ['Fundraising'], exp: 'New', tier: 'one_time', days: ['sat_am', 'sat_pm'], hours: 4, remote: false, joined: 21, extra: { 'Board trained': 'no' } },
  { name: 'Kai Nakamura', skills: ['Board operation'], exp: 'New', tier: 'seasonal', days: ['sun_am'], hours: 3, remote: false, joined: 60, asked: 25, extra: { 'Board trained': 'yes' } },
  { name: 'Lou Ferreira', skills: ['Engineering', 'Board operation'], exp: 'Has done it before', tier: 'regular', days: ['wed_eve'], hours: 3, remote: false, joined: 700, asked: 6, extra: { 'Board trained': 'yes' } },
  { name: 'Mara Quist', skills: ['On-air hosting', 'Writing'], exp: 'Has done it before', tier: 'regular', days: ['tue_eve'], hours: 2, remote: true, joined: 240, asked: 18, extra: { 'Board trained': 'no' } },
  { name: 'Nico Bauer', skills: ['Music library'], exp: 'New', tier: 'one_time', days: [], hours: 2, remote: true, joined: 45, extra: { 'Board trained': 'no' } },
  { name: 'Orla Byrne', skills: ['Fundraising', 'On-air hosting'], exp: 'Can lead', tier: 'core', days: ['thu_eve', 'sat_am'], hours: 5, remote: false, joined: 1200, asked: 4, extra: { 'Board trained': 'yes' } },
  { name: 'Pavel Novak', skills: ['Audio editing'], exp: 'Has done it before', tier: 'seasonal', days: [], hours: 2, remote: true, joined: 150, asked: 55, extra: { 'Board trained': 'no' } },
  { name: 'Ruth Abara', skills: ['Fundraising'], exp: 'Has done it before', tier: 'regular', days: ['sat_am'], hours: 3, remote: false, joined: 410, asked: 11, extra: { 'Board trained': 'no' } },
  { name: 'Theo Lam', skills: ['Web'], exp: 'New', tier: 'one_time', days: [], hours: 1, remote: true, joined: 26, extra: { 'Board trained': 'no' } },
];

export const radio: Dataset = {
  kind: 'radio',
  name: 'Sample: Riverside Community Radio',
  tz: 'America/New_York',
  skills: ['Audio editing', 'Board operation', 'Engineering', 'Fundraising', 'Music library', 'On-air hosting', 'Web', 'Writing'],
  extraFields: [{ label: 'Board trained', type: 'yesno', options: [] }],
  tags: { settled: ['Board', 'On air', 'Pledge drive', 'Remote', 'Engineering'], fresh: ['board ops', 'Library'] },
  tagsFor(p) {
    const out: string[] = [];
    if (p.skills.includes('Board operation')) out.push(['Kai Nakamura', 'Lou Ferreira'].includes(p.name) ? 'board ops' : 'Board');
    if (p.skills.includes('On-air hosting')) out.push('On air');
    if (p.skills.includes('Fundraising')) out.push('Pledge drive');
    if (p.skills.includes('Engineering')) out.push('Engineering');
    if (p.skills.includes('Music library') || p.skills.includes('Audio editing')) out.push('Library');
    if (p.remote) out.push('Remote');
    return out.slice(0, 3);
  },
  people: PEOPLE,
  paused: { noAnswer: 'Erin Walsh', byChoice: 'Pavel Novak' },
  teams: [
    { name: 'Board operators', has: (p) => p.extra?.['Board trained'] === 'yes' },
    { name: 'Pledge drive', has: (p) => p.skills.includes('Fundraising') },
  ],
  contact: 'Sol, station manager',
  import: {
    fileName: 'volunteer-roster.csv', added: 17, merged: 1,
    setAside: [{ row: 9, cells: { Name: 'DJ Nightfall', Email: '', Phone: '' }, reason: 'No email or phone' }],
  },
  async story({ now, at, until, req, task, ask, need, item }) {
    const board = req('Board trained', 'isYes');
    const host = req('Skills', 'includes', 'On-air hosting');
    const fund = req('Skills', 'includes', 'Fundraising');
    const eng = req('Skills', 'includes', 'Engineering');

    // Past shifts.
    const overnight = task({ title: 'Overnight board shift', start: at(-25, 0), end: at(-25, 6), place: 'Studio A', people: 1, reqs: [board], status: 'done', tags: ['Board'] });
    await ask(overnight, 'Dante Ruiz', 'yes', now - 30 * DAY, 1, 'done');
    await ask(overnight, 'Kai Nakamura', 'no', now - 30 * DAY, 1);
    const archive = task({ title: 'Digitize the jazz archive, box 4', due: at(-14, 17), people: 2, reqs: [req('Skills', 'includes', 'Music library')], status: 'done', remote: true, effort: 180, tags: ['Library', 'Remote'] });
    for (const n of ['Greta Holm', 'Cleo Marsh']) await ask(archive, n, 'yes', now - 21 * DAY, 1, 'done');
    const tower = task({ title: 'Transmitter site check', start: at(-10, 9), end: at(-10, 12), place: 'Mill Hill tower', address: 'Gate code 4471', people: 1, reqs: [eng], status: 'done', bring: 'Boots', tags: ['Engineering'] });
    await ask(tower, 'Bram Visser', 'yes', now - 14 * DAY, 1, 'done');
    await ask(tower, 'Lou Ferreira', 'expired', now - 14 * DAY, 1);
    const spring = task({ title: 'Spring drive phone bank', start: at(-200, 18), end: at(-200, 21), place: 'Studio B', people: 6, reqs: [], status: 'done', tags: ['Pledge drive'] });
    for (const n of ['Orla Byrne', 'Ruth Abara', 'Erin Walsh', 'Ada Lindgren']) await ask(spring, n, 'yes', now - 205 * DAY, 1, 'done');

    // This week.
    const sat = until(6);
    const morning = task({ title: 'Saturday morning board op', desc: 'Run the board for the 6 to 10 block.', start: at(sat, 6), end: at(sat, 10), place: 'Studio A', people: 1, reqs: [board], status: 'filled', tags: ['Board'], publish: true });
    await ask(morning, 'Ada Lindgren', 'yes', now - 5 * DAY, 1, 'holding');
    const guide = task({ title: 'Write the November program guide', due: at(6, 17), people: 1, reqs: [req('Skills', 'includes', 'Writing')], status: 'open', remote: true, effort: 90, nextRound: now - HOUR, tags: ['Remote'] });
    await ask(guide, 'Mara Quist', 'no', now - 3 * DAY, 1);

    // The pledge drive, next week, with the phones still short.
    const driveStart = sat + 3;
    const drive = need({ title: 'Fall pledge drive', startsAt: at(driveStart, 18), status: 'active', created: now - 15 * DAY, tags: ['Pledge drive'] });
    const phones = task({ title: 'Pledge drive phone bank, Tuesday', desc: 'Answer pledge calls and enter them in the sheet.', start: at(driveStart, 18), end: at(driveStart, 21), place: 'Studio B', people: 6, reqs: [], status: 'open', need: drive, nextRound: now + 3 * HOUR, tags: ['Pledge drive'], publish: true });
    await ask(phones, 'Ruth Abara', 'yes', now - 4 * DAY, 1, 'holding');
    await ask(phones, 'Orla Byrne', 'yes', now - 4 * DAY, 1, 'holding');
    await ask(phones, 'Jamal Price', 'waiting', now - 5 * HOUR, 2);
    await ask(phones, 'Erin Walsh', 'expired', now - 4 * DAY, 1);
    task({ title: 'On-air pitch, Tuesday drive hours', desc: 'Co-host the 6 to 9 block and read the pitches.', start: at(driveStart, 18), end: at(driveStart, 21), place: 'Studio A', people: 2, reqs: [host], status: 'open', need: drive, tags: ['On air', 'Pledge drive'] });
    task({ title: 'Thank-you notes to donors', desc: 'Handwrite notes for gifts over $100.', due: at(driveStart + 10, 17), people: 3, status: 'open', need: drive, remote: true, effort: 60, tags: ['Pledge drive', 'Remote'] });
    item(drive, 'supply', 'Phone lines', '6 lines, borrowed handsets', 'covered');
    item(drive, 'supply', 'Thank-you gifts', '200 mugs, due Friday');
    item(drive, 'info', 'Pitch script', 'From the development committee');

    // A new show, still a draft.
    const show = need({ title: 'New show: Late Shift', startsAt: at(21, 22), repeat: 'weekly', status: 'draft', created: now - DAY, tags: ['On air'] });
    task({ title: 'Host, Late Shift', desc: 'Two hours a week, Thursdays at 10pm.', start: at(21, 22), end: at(22, 0), place: 'Studio A', people: 1, reqs: [host], status: 'draft', need: show, tags: ['On air'] });
    task({ title: 'Board op, Late Shift', start: at(21, 22), end: at(22, 0), place: 'Studio A', people: 1, reqs: [board], status: 'draft', need: show, tags: ['Board'] });
    task({ title: 'Write the promo', desc: 'Two 30-second promos for the new show.', due: at(14, 17), people: 1, status: 'draft', need: show, remote: true, effort: 45, tags: ['Remote'] });
    item(show, 'info', 'Program committee sign-off', 'Meets next Monday');

    // Standing remote work for first offers.
    task({ title: 'Tag the new arrivals in the library', desc: 'About 40 records.', due: at(8, 17), people: 1, status: 'open', remote: true, effort: 60, tags: ['Library', 'Remote'] });
    task({ title: 'Update the schedule page', due: at(4, 17), people: 1, reqs: [req('Skills', 'includes', 'Web')], status: 'open', remote: true, effort: 30, tags: ['Remote'] });
    void fund;
  },
};

import { describe, expect, it } from 'vitest';
import { Client, DAY, HOUR, addVolunteer, newOrg, newTask, openLink, signIn, uniqueEmail } from './helpers';

describe('sign-in', () => {
  it('signs in with an emailed code and rejects a wrong one', async () => {
    const c = new Client();
    const email = uniqueEmail();
    const start = await c.post('/api/auth/start', { email });
    expect(start.status).toBe(200);
    expect(start.body.devCode).toMatch(/^\d{6}$/);
    const wrong = await c.post('/api/auth/verify', { email, code: start.body.devCode === '000000' ? '111111' : '000000' });
    expect(wrong.status).toBe(401);
    const ok = await c.post('/api/auth/verify', { email, code: start.body.devCode });
    expect(ok.status).toBe(200);
    expect((await c.get('/api/me')).status).toBe(200);
  });

  it('needs a session for coordinator routes', async () => {
    expect((await new Client().get('/api/me')).status).toBe(401);
  });

  it('refuses changes without the request header, which blocks cross-site form posts', async () => {
    const c = await signIn();
    const res = await c.raw('/api/orgs', {
      method: 'POST',
      headers: { 'x-requested-with': 'nope' },
      json: { name: 'Forged' },
    });
    expect(res.status).toBe(403);
  });
});

describe('two organizations stay apart', () => {
  it('rejects every cross-organization request', async () => {
    const a = await newOrg('Chapter A');
    const b = await newOrg('Chapter B');
    const sam = await addVolunteer(a, 'Sam');
    const task = await newTask(a);
    const team = (await a.client.post(a.api('/teams'), { name: 'Desk crew' })).body.id;

    const asB = b.client;
    const paths = [
      ['GET', a.api('')],
      ['GET', a.api('/volunteers')],
      ['GET', a.api(`/volunteers/${sam}`)],
      ['PATCH', a.api(`/volunteers/${sam}`)],
      ['GET', a.api('/tasks')],
      ['GET', a.api(`/tasks/${task}`)],
      ['POST', a.api(`/tasks/${task}/ask`)],
      ['GET', a.api('/today')],
      ['GET', a.api('/export.json')],
      ['GET', a.api('/export/volunteers.csv')],
      ['GET', a.api('/fields')],
      ['GET', a.api('/teams')],
    ] as const;
    for (const [method, path] of paths) {
      const res = await asB.req(method, path, method === 'GET' ? undefined : { volunteerIds: [sam] });
      expect(res.status, `${method} ${path}`).toBe(404);
      expect(res.text).not.toContain('Sam');
    }

    // B can't reach A's people or teams through B's own organization either.
    const bTask = await newTask(b);
    const ask = await asB.post(b.api(`/tasks/${bTask}/ask`), { volunteerIds: [sam] });
    expect(ask.body.asks).toHaveLength(0);
    expect(ask.body.skipped[0].reason).toBe('unknown');
    expect((await asB.get(b.api(`/volunteers/${sam}`))).status).toBe(404);
    const bTeam = (await asB.post(b.api('/teams'), { name: 'Mine' })).body.id;
    expect((await asB.post(b.api(`/teams/${bTeam}/members`), { volunteerId: sam })).status).toBe(404);
    expect((await asB.post(b.api(`/teams/${team}/members`), { volunteerId: sam })).status).toBe(404);
    const reqWithATeam = await asB.post(b.api('/tasks'), {
      title: 'x', timing: 'none', peopleNeeded: 1, requirements: [{ kind: 'team', teamId: team }],
    });
    expect(reqWithATeam.status).toBe(400);
  });
});

describe('import', () => {
  it('maps columns, finds duplicates, merges and sets aside rows with no contact', async () => {
    const org = await newOrg();
    const existing = await addVolunteer(org, 'Bea Smith', {}, { email: 'bea@example.com' });
    const rows = [
      { name: 'Alex Rivera', email: 'alex@example.com', skills: 'Communications, Writing', exp: 'Has done it before' },
      { name: 'Beatrice Smith', email: 'bea@example.com', skills: 'Events', exp: '' },
      { name: 'Alex R.', email: 'ALEX@example.com', skills: 'Design', exp: '' },
      { name: 'Nobody Reachable', email: '', skills: '', exp: '' },
    ];
    const preview = await org.client.post(org.api('/import/preview'), { rows });
    expect(preview.body.rows[1].duplicateOf.volunteerId).toBe(existing);
    expect(preview.body.rows[2].duplicateOfRow).toBe(0);
    expect(preview.body.rows[3].problem).toBe('No email or phone');

    const columnMap = { name: 'name', email: 'email', skills: `field:${org.fields.Skills}`, exp: `field:${org.fields.Experience}`, shirt: 'new:Shirt size' };
    const missingConsent = await org.client.post(org.api('/import/commit'), { columnMap, rows: [] });
    expect(missingConsent.status).toBe(400);

    const commit = await org.client.post(org.api('/import/commit'), {
      fileName: 'list.csv',
      fileType: 'csv',
      contactConfirmed: true,
      columnMap,
      rows: [
        { cells: { ...rows[0], shirt: 'M' }, action: 'add' },
        { cells: rows[1], action: 'merge', mergeInto: existing },
        { cells: rows[2], action: 'merge', mergeIntoRow: 0 },
        { cells: rows[3], action: 'add' },
      ],
    });
    expect(commit.status).toBe(200);
    expect(commit.body).toMatchObject({ added: 1, merged: 2 });
    expect(commit.body.setAside).toHaveLength(1);

    const people = (await org.client.get(org.api('/volunteers'))).body.volunteers;
    expect(people).toHaveLength(2);
    const alex = people.find((p: any) => p.name === 'Alex Rivera');
    expect(alex.values[org.fields.Skills].sort()).toEqual(['Communications', 'Design', 'Writing']);
    expect(alex.contactOkAt).not.toBeNull();
    const fields = (await org.client.get(org.api('/fields'))).body.fields;
    const shirt = fields.find((f: any) => f.label === 'Shirt size');
    expect(alex.values[shirt.id]).toBe('M');
    const bea = people.find((p: any) => p.id === existing);
    expect(bea.values[org.fields.Skills]).toEqual(['Events']);

    const today = (await org.client.get(org.api('/today'))).body;
    expect(today.items.some((i: any) => i.kind === 'set_aside' && i.count === 1)).toBe(true);
  });
});

describe('asking people', () => {
  it('asks only people who meet the requirements, longest wait first', async () => {
    const org = await newOrg();
    const team = (await org.client.post(org.api('/teams'), { name: 'Desk crew' })).body.id;
    const lead = { [org.fields.Experience]: 'Can lead' };
    const newer = { [org.fields.Experience]: 'New' };
    const jordan = await addVolunteer(org, 'Jordan', lead);
    const priya = await addVolunteer(org, 'Priya', lead);
    const omar = await addVolunteer(org, 'Omar', lead);
    const ben = await addVolunteer(org, 'Ben', newer);
    for (const v of [jordan, priya, ben]) await org.client.post(org.api(`/teams/${team}/members`), { volunteerId: v });

    // Jordan was asked recently for something else, so Priya goes first.
    const other = await newTask(org, { title: 'Other', peopleNeeded: 1 });
    await org.client.post(org.api(`/tasks/${other}/ask`), { volunteerIds: [jordan] });

    const task = await newTask(org, {
      peopleNeeded: 1,
      requirements: [
        { kind: 'field', fieldId: org.fields.Experience, op: 'is', value: 'Can lead' },
        { kind: 'team', teamId: team },
      ],
    });
    const detail = (await org.client.get(org.api(`/tasks/${task}`))).body;
    const reasons = Object.fromEntries(detail.candidates.map((c: any) => [c.name, c.reason]));
    expect(reasons).toMatchObject({ Priya: null, Jordan: null, Omar: 'requirements', Ben: 'requirements' });
    expect(detail.nextGroup).toEqual([priya, jordan]);
    expect(detail.requirementLines).toEqual(['Experience is Can lead', 'Team: Desk crew']);

    // A person who doesn't fit is skipped on the server, whatever the browser sends.
    const asked = await org.client.post(org.api(`/tasks/${task}/ask`), { volunteerIds: [priya, omar] });
    expect(asked.body.asks.map((a: any) => a.volunteerId)).toEqual([priya]);
    expect(asked.body.skipped).toEqual([{ volunteerId: omar, reason: 'requirements' }]);
    expect(asked.body.asks[0].link).toMatch(/^https:\/\/app\.test\/v\/[\w-]{40,}$/);
    expect(asked.body.asks[0].message).toContain('Hi Priya, can you help Chapter A with "Registration desk"');
  });

  it('holds the weekly ask limit on the server', async () => {
    const org = await newOrg();
    const sam = await addVolunteer(org, 'Sam');
    for (let i = 0; i < 2; i++) {
      const t = await newTask(org, { title: `Task ${i}`, startsAt: Date.now() + (5 + i) * DAY, endsAt: Date.now() + (5 + i) * DAY + HOUR });
      expect((await org.client.post(org.api(`/tasks/${t}/ask`), { volunteerIds: [sam] })).body.asks).toHaveLength(1);
    }
    const third = await newTask(org, { title: 'Third', startsAt: Date.now() + 9 * DAY, endsAt: Date.now() + 9 * DAY + HOUR });
    const res = await org.client.post(org.api(`/tasks/${third}/ask`), { volunteerIds: [sam] });
    expect(res.body.asks).toHaveLength(0);
    expect(res.body.skipped[0].reason).toBe('weekly_limit');
  });

  it('runs the whole loop: yes from a phone, already filled, I cannot make it, next group', async () => {
    const org = await newOrg();
    const ids = [];
    for (const name of ['Ana', 'Ben', 'Cy', 'Di', 'Ed']) ids.push(await addVolunteer(org, name));
    const task = await newTask(org, { peopleNeeded: 2, placePrivate: '120 Main St, Room 2', placePublic: 'Downtown library' });
    const asked = (await org.client.post(org.api(`/tasks/${task}/ask`), { volunteerIds: ids.slice(0, 3) })).body.asks;

    // The link swaps its token for a session and leaves the address bar clean.
    const phone1 = new Client();
    const open = await phone1.raw(new URL(asked[0].link).pathname);
    expect(open.status).toBe(302);
    expect(open.headers.get('location')).toBe(`/me?ask=${asked[0].askId}`);
    expect(open.headers.get('referrer-policy')).toBe('no-referrer');
    expect(phone1.cookies.has('vs')).toBe(true);

    const me = (await phone1.get('/api/v/me')).body;
    expect(me.asks[0].task.placePrivate).toBe('120 Main St, Room 2');
    expect(JSON.stringify(me)).not.toContain('Ben');

    expect((await phone1.post(`/api/v/asks/${asked[0].askId}/answer`, { answer: 'yes' })).body.result).toBe('yes');
    const phone2 = await openLink(asked[1].link);
    expect((await phone2.post(`/api/v/asks/${asked[1].askId}/answer`, { answer: 'yes' })).body.result).toBe('yes');

    let detail = (await org.client.get(org.api(`/tasks/${task}`))).body;
    expect(detail.task.status).toBe('filled');
    expect(detail.holding).toBe(2);
    expect(detail.asks.find((a: any) => a.id === asked[2].askId).status).toBe('closed');

    const phone3 = await openLink(asked[2].link);
    expect((await phone3.post(`/api/v/asks/${asked[2].askId}/answer`, { answer: 'yes' })).body.result).toBe('filled');

    // A volunteer can't answer someone else's ask.
    expect((await phone3.post(`/api/v/asks/${asked[0].askId}/answer`, { answer: 'no' })).status).toBe(404);

    // One person drops out: the spot reopens and Today says to ask the next group.
    const spot = (await phone2.get('/api/v/me')).body.upcoming[0];
    expect((await phone2.post(`/api/v/spots/${spot.id}/cant`)).status).toBe(200);
    detail = (await org.client.get(org.api(`/tasks/${task}`))).body;
    expect(detail.task.status).toBe('open');
    expect(detail.roundDue).toBe(true);
    expect(detail.nextGroup).toEqual([ids[3], ids[4]]);
    const today = (await org.client.get(org.api('/today'))).body;
    expect(today.items).toContainEqual(expect.objectContaining({ kind: 'ask_next', taskId: task, holding: 1, peopleNeeded: 2 }));

    const next = (await org.client.post(org.api(`/tasks/${task}/ask`), { volunteerIds: detail.nextGroup })).body.asks;
    const phone4 = await openLink(next[0].link);
    expect((await phone4.post(`/api/v/asks/${next[0].askId}/answer`, { answer: 'yes' })).body.result).toBe('yes');
    expect((await org.client.get(org.api(`/tasks/${task}`))).body.task.status).toBe('filled');
  });

  it('gives the last spot to exactly one of two people who say yes at once', async () => {
    const org = await newOrg();
    const a = await addVolunteer(org, 'Ana');
    const b = await addVolunteer(org, 'Ben');
    const task = await newTask(org, { peopleNeeded: 1 });
    const asks = (await org.client.post(org.api(`/tasks/${task}/ask`), { volunteerIds: [a, b] })).body.asks;
    const [p1, p2] = await Promise.all(asks.map((x: any) => openLink(x.link)));
    const results = await Promise.all([
      p1.post(`/api/v/asks/${asks[0].askId}/answer`, { answer: 'yes' }),
      p2.post(`/api/v/asks/${asks[1].askId}/answer`, { answer: 'yes' }),
    ]);
    expect(results.map((r) => r.body.result).sort()).toEqual(['filled', 'yes']);
    expect((await org.client.get(org.api(`/tasks/${task}`))).body.holding).toBe(1);
  });
});

describe('time passing', () => {
  it('expires asks, pauses after three unanswered, and lifts the pause on any answer', async () => {
    const org = await newOrg();
    await org.client.patch(org.api(''), { weeklyAskLimit: 14 });
    const sam = await addVolunteer(org, 'Sam');
    const start = Date.now();
    const links = [];
    for (let i = 0; i < 4; i++) {
      org.client.now = start + i * 3 * DAY;
      const t = await newTask(org, { title: `T${i}`, startsAt: start + 30 * DAY + i * DAY, endsAt: start + 30 * DAY + i * DAY + HOUR });
      const res = (await org.client.post(org.api(`/tasks/${t}/ask`), { volunteerIds: [sam] })).body;
      if (i < 3) {
        expect(res.asks).toHaveLength(1);
        links.push(res.asks[0]);
      } else {
        expect(res.skipped[0].reason).toBe('paused');
      }
    }
    const person = (await org.client.get(org.api(`/volunteers/${sam}`))).body.volunteer;
    expect(person.status).toBe('paused');
    expect(person.standing).toBe('Paused: 3 unanswered asks');

    const phone = await openLink(links[0].link, org.client.now);
    expect((await phone.post(`/api/v/asks/${links[0].askId}/answer`, { answer: 'no' })).body.result).toBe('no');
    expect((await org.client.get(org.api(`/volunteers/${sam}`))).body.volunteer.status).toBe('active');
  });

  it('marks work done when its time passes, with nobody confirming', async () => {
    const org = await newOrg();
    const sam = await addVolunteer(org, 'Sam');
    const start = Date.now() + 3 * DAY;
    const task = await newTask(org, { peopleNeeded: 1, startsAt: start, endsAt: start + 2 * HOUR });
    const ask = (await org.client.post(org.api(`/tasks/${task}/ask`), { volunteerIds: [sam] })).body.asks[0];
    const phone = await openLink(ask.link);
    await phone.post(`/api/v/asks/${ask.askId}/answer`, { answer: 'yes' });

    org.client.now = start + 3 * HOUR;
    const detail = (await org.client.get(org.api(`/tasks/${task}`))).body;
    expect(detail.task.status).toBe('done');
    expect(detail.spots[0].status).toBe('done');

    expect((await org.client.post(org.api(`/spots/${detail.spots[0].id}/missed`))).status).toBe(200);
    expect((await org.client.get(org.api(`/tasks/${task}`))).body.spots[0].status).toBe('missed');
  });
});

describe('private links', () => {
  it('stops an old link working once a new one is made', async () => {
    const org = await newOrg();
    const sam = await addVolunteer(org, 'Sam');
    const task = await newTask(org, { peopleNeeded: 1 });
    const ask = (await org.client.post(org.api(`/tasks/${task}/ask`), { volunteerIds: [sam] })).body.asks[0];
    const phone = await openLink(ask.link);
    const renewed = (await org.client.post(org.api(`/asks/${ask.askId}/link`))).body;
    expect(renewed.link).not.toBe(ask.link);
    expect((await new Client().raw(new URL(ask.link).pathname)).status).toBe(410);
    expect((await phone.get('/api/v/me')).status).toBe(401);
    expect((await new Client().raw(new URL(renewed.link).pathname)).status).toBe(302);
  });

  it('rejects made-up tokens and requests with no session', async () => {
    expect((await new Client().raw('/v/not-a-real-token-at-all-but-long-enough')).status).toBe(410);
    expect((await new Client().get('/api/v/me')).status).toBe(401);
  });

  it('stops contact when a volunteer asks', async () => {
    const org = await newOrg();
    const sam = await addVolunteer(org, 'Sam');
    const t1 = await newTask(org, { peopleNeeded: 1 });
    const ask = (await org.client.post(org.api(`/tasks/${t1}/ask`), { volunteerIds: [sam] })).body.asks[0];
    const phone = await openLink(ask.link);
    expect((await phone.post('/api/v/stop')).status).toBe(200);
    const t2 = await newTask(org, { title: 'Later', startsAt: Date.now() + 20 * DAY, endsAt: Date.now() + 20 * DAY + HOUR });
    expect((await org.client.post(org.api(`/tasks/${t2}/ask`), { volunteerIds: [sam] })).body.skipped[0].reason).toBe('stopped');
  });
});

describe('roles', () => {
  it('lets a team lead manage only their own team', async () => {
    const org = await newOrg();
    const desk = (await org.client.post(org.api('/teams'), { name: 'Desk' })).body.id;
    const sound = (await org.client.post(org.api('/teams'), { name: 'Sound' })).body.id;
    const sam = await addVolunteer(org, 'Sam');
    const leadEmail = uniqueEmail('lead');
    const member = (await org.client.post(org.api('/members'), { email: leadEmail, role: 'lead' })).body.id;
    await org.client.post(org.api(`/teams/${desk}/leads`), { memberId: member });

    const lead = await signIn(leadEmail);
    expect((await lead.post(org.api(`/teams/${desk}/members`), { volunteerId: sam })).status).toBe(200);
    expect((await lead.post(org.api(`/teams/${sound}/members`), { volunteerId: sam })).status).toBe(403);
    const base = { title: 'x', timing: 'none', peopleNeeded: 1, requirements: [] };
    expect((await lead.post(org.api('/tasks'), { ...base, teamId: desk })).status).toBe(201);
    expect((await lead.post(org.api('/tasks'), { ...base, teamId: sound })).status).toBe(403);
    expect((await lead.post(org.api('/tasks'), base)).status).toBe(403);
    expect((await lead.get(org.api('/export.json'))).status).toBe(403);
  });

  it('keeps at least one admin', async () => {
    const org = await newOrg();
    const members = (await org.client.get(org.api('/members'))).body.members;
    expect((await org.client.del(org.api(`/members/${members[0].id}`))).status).toBe(409);
  });
});

describe('deleting a detail or a team', () => {
  it('takes it out of task requirements, so the task still matches people', async () => {
    const org = await newOrg();
    const team = (await org.client.post(org.api('/teams'), { name: 'Desk' })).body.id;
    await addVolunteer(org, 'Sam', { [org.fields.Experience]: 'New' });
    const task = await newTask(org, {
      peopleNeeded: 1,
      requirements: [
        { kind: 'field', fieldId: org.fields.Experience, op: 'is', value: 'Can lead' },
        { kind: 'team', teamId: team },
      ],
    });
    expect((await org.client.get(org.api(`/tasks/${task}`))).body.nextGroup).toHaveLength(0);
    await org.client.del(org.api(`/fields/${org.fields.Experience}`));
    await org.client.del(org.api(`/teams/${team}`));
    const detail = (await org.client.get(org.api(`/tasks/${task}`))).body;
    expect(detail.task.requirements).toEqual([]);
    expect(detail.nextGroup).toHaveLength(1);
  });
});

describe('export', () => {
  it('exports CSV with formula-looking cells made safe', async () => {
    const org = await newOrg();
    await addVolunteer(org, '=HYPERLINK("http://evil")');
    const res = await org.client.get(org.api('/export/volunteers.csv'));
    expect(res.status).toBe(200);
    expect(res.text).toContain(`"'=HYPERLINK(""http://evil"")"`);
    const json = (await org.client.get(org.api('/export.json'))).body;
    expect(json.format).toBe('voluntold-export-1');
    expect(json.volunteers).toHaveLength(1);
  });
});

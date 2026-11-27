import { describe, expect, it } from 'vitest';
import { addVolunteer, newOrg, newTask, signIn, uniqueEmail } from './helpers';
import { setupState } from '../src/shared/setup';

describe('setup guide', () => {
  it('starts with the organization done and finishes steps from real data', async () => {
    const org = await newOrg();
    const start = (await org.client.get(org.api(''))).body.setup;
    expect(start).toMatchObject({ done: 1, total: 6, finished: false, hidden: false, next: 'admin' });
    expect(start.steps.map((s: any) => s.key)).toEqual(['org', 'admin', 'people', 'details', 'task', 'ask']);

    await org.client.post(org.api('/members'), { email: uniqueEmail('second'), role: 'admin' });
    expect((await org.client.get(org.api(''))).body.setup).toMatchObject({ done: 2, next: 'people' });

    await addVolunteer(org, 'Sam Okafor');
    expect((await org.client.get(org.api(''))).body.setup).toMatchObject({ done: 3, next: 'details' });

    // Checking the fields is the only step with nothing to count. The person says when it's done.
    await org.client.patch(org.api('/setup'), { seen: 'details' });
    expect((await org.client.get(org.api(''))).body.setup).toMatchObject({ done: 4, next: 'task' });

    await newTask(org);
    expect((await org.client.get(org.api(''))).body.setup).toMatchObject({ done: 5, next: 'ask' });
  });

  it('skips only the optional steps, and hides and comes back', async () => {
    const org = await newOrg();
    await org.client.patch(org.api('/setup'), { skip: 'people' });
    await org.client.patch(org.api('/setup'), { skip: 'admin' });
    const setup = (await org.client.patch(org.api('/setup'), { hidden: true })).body.setup;
    expect(setup.hidden).toBe(true);
    expect(setup.steps.find((s: any) => s.key === 'people').skipped).toBe(false);
    expect(setup.steps.find((s: any) => s.key === 'admin').skipped).toBe(true);
    expect((await org.client.patch(org.api('/setup'), { hidden: false })).body.setup.hidden).toBe(false);
  });

  it('keeps the guide to its own organization', async () => {
    const org = await newOrg();
    const stranger = await signIn();
    expect((await stranger.patch(org.api('/setup'), { hidden: true })).status).toBe(404);
  });

  it('is finished when every step is done or skipped', () => {
    const all = setupState({ people: 3, tasks: 1, asks: 2, admins: 1 }, { skipped: ['admin', 'details'] });
    expect(all).toMatchObject({ done: 4, finished: true, next: null });
    expect(setupState({ people: 0, tasks: 0, asks: 0, admins: 1 }, { skipped: ['admin'] }).next).toBe('people');
  });

  it('saves what the organization calls its people at sign-up', async () => {
    const client = await signIn();
    const res = await client.post('/api/orgs', { name: 'Radio', adultsConfirmed: true, peopleWord: 'members', currentTool: 'A spreadsheet' });
    const info = (await client.get(`/api/orgs/${res.body.id}`)).body;
    expect(info.org.peopleWord).toBe('members');
    expect(info.setup.currentTool).toBe('A spreadsheet');
  });
});

import { describe, expect, it } from 'vitest';
import { DAY, addVolunteer, newOrg, newTask } from './helpers';

describe('roles and succession', () => {
  it('keeps a role through a handoff: holder, history, notes and open tasks', async () => {
    const org = await newOrg('Coaches Association');
    const ana = await addVolunteer(org, 'Ana');
    const ben = await addVolunteer(org, 'Ben');
    const role = (await org.client.post(org.api('/roles'), { name: 'Clinics chair', responsibilities: 'Run the spring clinics' })).body.id;

    let list = (await org.client.get(org.api('/roles'))).body.roles;
    expect(list[0]).toMatchObject({ name: 'Clinics chair', holder: null });

    const end = Date.now() + 30 * DAY;
    expect((await org.client.post(org.api(`/roles/${role}/assign`), { volunteerId: ana, endsAt: end })).status).toBe(200);
    await org.client.patch(org.api(`/roles/${role}`), { handoff: 'Venue contract renews in March' });
    const task = await newTask(org, { title: 'Book the spring venue', roleId: role });

    await org.client.post(org.api(`/roles/${role}/assign`), { volunteerId: ben });
    const detail = (await org.client.get(org.api(`/roles/${role}`))).body;
    expect(detail.holder).toMatchObject({ volunteerId: ben, name: 'Ben' });
    expect(detail.history.map((t: any) => t.name)).toEqual(['Ana']);
    expect(detail.role).toMatchObject({ responsibilities: 'Run the spring clinics', handoff: 'Venue contract renews in March' });
    expect(detail.openTasks.map((t: any) => t.id)).toEqual([task]);

    const anaView = (await org.client.get(org.api(`/volunteers/${ana}`))).body;
    expect(anaView.roles[0]).toMatchObject({ name: 'Clinics chair' });
    expect(anaView.roles[0].endedAt).not.toBeNull();

    await org.client.post(org.api(`/roles/${role}/vacate`));
    list = (await org.client.get(org.api('/roles'))).body.roles;
    expect(list[0]).toMatchObject({ holder: null, pastHolders: 2, openTasks: 1 });
  });

  it("keeps roles inside their organization", async () => {
    const a = await newOrg('A');
    const b = await newOrg('B');
    const role = (await a.client.post(a.api('/roles'), { name: 'Treasurer' })).body.id;
    const bPerson = await addVolunteer(b, 'Bo');
    expect((await b.client.get(b.api(`/roles/${role}`))).status).toBe(404);
    expect((await a.client.post(a.api(`/roles/${role}/assign`), { volunteerId: bPerson })).status).toBe(404);
    const bTask = await newTask(b);
    expect((await b.client.patch(b.api(`/tasks/${bTask}`), { roleId: role })).status).toBe(400);
  });

  it('sends renewal reminders only when the organization tracks renewals', async () => {
    const org = await newOrg();
    expect((await org.client.get(org.api(''))).body.org.trackRenewals).toBe(false);
    await org.client.patch(org.api(''), { trackRenewals: true });
    expect((await org.client.get(org.api(''))).body.org.trackRenewals).toBe(true);
  });
});

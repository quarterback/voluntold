import { describe, expect, it } from 'vitest';
import { addVolunteer, newOrg, newTask } from './helpers';

// Sign-ins are rate limited, so these sit apart from the other API tests.
describe('import, end to end', () => {
  it('takes the email from the column that holds one, and makes no fields when nobody comes in', async () => {
    const org = await newOrg();
    // Google Contacts: a label column beside the address. Both were once read as the email.
    const columnMap = { first: 'first', last: 'last', label: 'email', value: 'email', cell: 'phone', interests: 'new:Interests', joined: 'member:since' };
    const commit = await org.client.post(org.api('/import/commit'), {
      fileName: 'contacts.csv', fileType: 'csv', contactConfirmed: true, columnMap, newFieldTypes: { interests: 'many' },
      rows: [
        { cells: { first: 'Marisol', last: 'Vega', label: '* Home', value: 'Marisol.Vega@example.org', cell: '(503) 555-0142 x12', interests: 'Driving; Cooking', joined: '14/03/2021' }, action: 'add' },
        { cells: { first: 'Thu', last: 'Nguyen', label: '', value: 'thu@example.org', cell: '', interests: '"Front desk","Driving"', joined: '2023-09-01' }, action: 'add' },
      ],
    });
    expect(commit.body).toMatchObject({ added: 2, merged: 0 });
    const people = (await org.client.get(org.api('/volunteers'))).body.volunteers;
    const marisol = people.find((p: any) => p.name === 'Marisol Vega');
    expect(marisol).toMatchObject({ email: 'marisol.vega@example.org', phone: '5035550142' });
    const fields = (await org.client.get(org.api('/fields'))).body.fields;
    const interests = fields.find((f: any) => f.label === 'Interests');
    expect(interests.type).toBe('many');
    expect(interests.options.sort()).toEqual(['Cooking', 'Driving', 'Front desk']);
    expect(marisol.values[interests.id]).toEqual(['Driving', 'Cooking']);
    expect(new Date(people.find((p: any) => p.name === 'Thu Nguyen').memberSince).toISOString().slice(0, 10)).toBe('2023-09-01');

    const other = await newOrg();
    const none = await other.client.post(other.api('/import/commit'), {
      fileName: 'empty.csv', fileType: 'csv', contactConfirmed: true, columnMap: { n: 'name', shirt: 'new:Shirt' },
      rows: [{ cells: { n: 'Nobody Reachable', shirt: 'M' }, action: 'add' }],
    });
    expect(none.body).toMatchObject({ added: 0, merged: 0 });
    expect((await other.client.get(other.api('/fields'))).body.fields.some((f: any) => f.label === 'Shirt')).toBe(false);
  });

  it('matches a phone across formats, and undoes an import without touching people who were asked', async () => {
    const org = await newOrg();
    const existing = await addVolunteer(org, 'Darnell Okoye', {}, { email: null, phone: '+1 503 555 0177' });
    const preview = await org.client.post(org.api('/import/preview'), { rows: [{ name: 'D. Okoye', email: '', phone: '(503) 555-0177' }] });
    expect(preview.body.rows[0].duplicateOf.volunteerId).toBe(existing);

    const commit = await org.client.post(org.api('/import/commit'), {
      fileName: 'list.csv', fileType: 'csv', contactConfirmed: true, columnMap: { n: 'name', e: 'email' },
      rows: [{ cells: { n: 'Ana Duarte', e: 'ana@example.com' }, action: 'add' }, { cells: { n: 'Rae Kim', e: 'rae@example.com' }, action: 'add' }],
    });
    const taskId = await newTask(org, { peopleNeeded: 1, askMode: 'hand' });
    const people = (await org.client.get(org.api('/volunteers'))).body.volunteers;
    const ana = people.find((p: any) => p.name === 'Ana Duarte');
    const asked = await org.client.post(org.api(`/tasks/${taskId}/ask`), { volunteerIds: [ana.id] });
    expect(asked.status).toBe(200);

    const undo = await org.client.post(org.api(`/imports/${commit.body.importId}/undo`));
    expect(undo.body).toEqual({ removed: 1, kept: 1 });
    const after = (await org.client.get(org.api('/volunteers'))).body.volunteers.map((p: any) => p.name).sort();
    expect(after).toEqual(['Ana Duarte', 'Darnell Okoye']);
    expect((await org.client.get(org.api('/imports'))).body.imports[0].undone_at).not.toBeNull();

    const stranger = await newOrg('Chapter B');
    expect((await stranger.client.post(stranger.api(`/imports/${commit.body.importId}/undo`))).status).toBe(404);
  });
});

import { describe, expect, it } from 'vitest';
import { DAY, addVolunteer, newOrg } from './helpers';

describe('reports', () => {
  it('counts renewals in groups that add up, and lists one group at a time', async () => {
    const org = await newOrg('Report Org');
    const now = Date.now();
    expect((await org.client.get(org.api('/reports'))).body.renewals).toBeNull();
    await org.client.patch(org.api(''), { trackRenewals: true, memberCategories: ['Head coach'] });
    const expiring = [['Ann', 5], ['Bea', 20], ['Cal', 45], ['Dee', 80], ['Eli', -10], ['Fay', 200], ['Gus', -200]] as const;
    for (const [name, days] of expiring) await addVolunteer(org, name, {}, { memberExpiresAt: now + days * DAY, memberCategory: name === 'Ann' ? 'Head coach' : null });
    await addVolunteer(org, 'Hal');

    const summary = (await org.client.get(org.api('/reports'))).body;
    expect(summary.people).toBe(8);
    expect(summary.renewals).toEqual({ d30: 2, d60: 1, d90: 1, expired: 1 });
    expect(summary.categories).toContainEqual({ category: 'Head coach', count: 1 });
    expect(summary.participation.neverOffered).toBe(8);

    const soon = (await org.client.get(org.api('/reports/renewals/d30'))).body.rows;
    expect(soon.map((r: any) => r.name)).toEqual(['Ann', 'Bea']);
    const csv = (await org.client.get(org.api('/reports/renewals/expired?format=csv'))).text;
    expect(csv.split('\n')[0]).toBe('name,email,category,expires,dues_paid');
    expect(csv).toContain('Eli');
    expect(csv).not.toContain('Gus');
    expect((await org.client.get(org.api('/reports/renewals/someday'))).status).toBe(404);
  });

  it("doesn't show one organization's reports to another", async () => {
    const a = await newOrg('A');
    const b = await newOrg('B');
    await a.client.patch(a.api(''), { trackRenewals: true });
    expect((await b.client.get(a.api('/reports'))).status).toBe(404);
    expect((await b.client.get(a.api('/reports/renewals/d30'))).status).toBe(404);
  });
});

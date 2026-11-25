import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { Client, DAY, addVolunteer, newOrg } from './helpers';
import { sendDueEmails } from '../src/worker/mail';
import type { Env } from '../src/worker/env';

const withMail = (): Env => ({ ...(env as unknown as Env), RESEND_API_KEY: 're_test', EMAIL_FROM: 'Volley <asks@example.org>' });

function fakeResend() {
  const sent: any[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const req = input instanceof Request ? input : new Request(input, init);
    sent.push(...JSON.parse(await req.text()));
    return new Response('{"data":[]}', { status: 200 });
  });
  return sent;
}

async function approve(orgId: string) {
  await env.DB.prepare('UPDATE orgs SET approved_at = 1 WHERE id = ?').bind(orgId).run();
}

afterEach(() => vi.restoreAllMocks());

describe('membership', () => {
  it('keeps category, dates and dues on each person, and exports them', async () => {
    const org = await newOrg('Coaches Association');
    await org.client.patch(org.api(''), { peopleWord: 'members', memberCategories: ['Head coach', 'Assistant coach'] });
    const info = (await org.client.get(org.api(''))).body.org;
    expect(info).toMatchObject({ peopleWord: 'members', memberCategories: ['Head coach', 'Assistant coach'], renewalDays: 30 });

    const id = await addVolunteer(org, 'Pat Jones', {}, { memberCategory: 'Head coach', memberExpiresAt: '2027-06-30' });
    expect((await org.client.patch(org.api(`/volunteers/${id}`), { duesPaidAt: '2026-07-01', memberSince: 'not a date' })).status).toBe(400);
    expect((await org.client.patch(org.api(`/volunteers/${id}`), { duesPaidAt: '2026-07-01' })).status).toBe(200);
    const v = (await org.client.get(org.api(`/volunteers/${id}`))).body.volunteer;
    expect(v).toMatchObject({ memberCategory: 'Head coach', memberExpiresAt: Date.parse('2027-06-30'), duesPaidAt: Date.parse('2026-07-01') });

    const csv = (await org.client.get(org.api('/export/volunteers.csv'))).text;
    expect(csv.split('\n')[0]).toContain('membership_category,member_since,membership_expires,dues_paid');
    expect(csv).toContain('Head coach');
    expect((await org.client.patch(org.api(''), { peopleWord: 'fans' })).status).toBe(400);
  });

  it('imports membership columns and updates them on a re-import', async () => {
    const org = await newOrg();
    const rows = [{ Name: 'Lee Park', Email: 'lee@example.com', Level: 'Life', Expires: '2027-01-31', Paid: '2026-01-15' }];
    const columnMap = { Name: 'name', Email: 'email', Level: 'member:category', Expires: 'member:expires', Paid: 'member:dues' };
    const first = await org.client.post(org.api('/import/commit'), { columnMap, rows: rows.map((cells) => ({ cells, action: 'add' })), fileName: 'roster.csv', contactConfirmed: true });
    expect(first.body.added).toBe(1);
    const list = (await org.client.get(org.api('/volunteers'))).body.volunteers;
    const lee = list.find((v: any) => v.name === 'Lee Park');
    expect(lee).toMatchObject({ memberCategory: 'Life', memberExpiresAt: Date.parse('2027-01-31'), duesPaidAt: Date.parse('2026-01-15') });

    const again = [{ ...rows[0], Expires: '2028-01-31' }];
    await org.client.post(org.api('/import/commit'), { columnMap, rows: again.map((cells) => ({ cells, action: 'merge', mergeInto: lee.id })), fileName: 'roster.csv', contactConfirmed: true });
    const after = (await org.client.get(org.api(`/volunteers/${lee.id}`))).body.volunteer;
    expect(after.memberExpiresAt).toBe(Date.parse('2028-01-31'));
  });

  it('sends one renewal reminder before a membership expires, with an unsubscribe link', async () => {
    const org = await newOrg('Renewal Org');
    await approve(org.orgId);
    await org.client.patch(org.api(''), { renewalUrl: 'https://example.org/renew' });
    const now = Date.now();
    await addVolunteer(org, 'Soon Expiring', {}, { memberExpiresAt: now + 10 * DAY });
    await addVolunteer(org, 'Far Away', {}, { memberExpiresAt: now + 200 * DAY });
    const sent = fakeResend();
    await sendDueEmails(withMail(), now);
    await sendDueEmails(withMail(), now + HOUR_MS);
    const mine = sent.filter((m) => m.from.includes('Renewal Org'));
    expect(mine).toHaveLength(1);
    expect(mine[0].subject).toMatch(/^Your Renewal Org membership expires/);
    expect(mine[0].text).toContain('Renew here: https://example.org/renew');

    // The unsubscribe link asks first, then stops all email.
    const link = new URL(mine[0].text.match(/https:\/\/app\.test\/u\/\S+/)[0]);
    const c = new Client();
    expect((await c.get(link.pathname)).text).toContain('Unsubscribe');
    const id = link.pathname.split('/')[2].split('.')[0];
    expect((await env.DB.prepare('SELECT status FROM volunteers WHERE id = ?').bind(id).first<any>()).status).toBe('active');
    await c.raw(link.pathname, { method: 'POST' });
    expect((await env.DB.prepare('SELECT status FROM volunteers WHERE id = ?').bind(id).first<any>()).status).toBe('stopped');
    expect((await c.get('/u/' + id + '.forged')).status).toBe(404);
  });

  it('takes applications only when the page is open, and accepting adds the person', async () => {
    const org = await newOrg('Join Org');
    const form = (data: Record<string, string>) => new Client().raw(`/join/${org.orgId}`, { method: 'POST', body: new URLSearchParams(data), headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    expect((await new Client().get(`/join/${org.orgId}`)).status).toBe(404);
    await approve(org.orgId);
    await org.client.patch(org.api(''), { joinOpen: true, memberCategories: ['Regular'] });
    expect((await new Client().get(`/join/${org.orgId}`)).text).toContain("I'm 18 or older");

    expect((await form({ name: 'No Boxes', email: 'nb@example.com' })).status).toBe(400);
    expect((await form({ name: 'Bot', email: 'bot@example.com', adult: 'on', consent: 'on', website: 'spam' })).status).toBe(200);
    expect((await form({ name: 'Kim Lee', email: 'kim@example.com', category: 'Regular', adult: 'on', consent: 'on', note: 'Can help at clinics' })).status).toBe(200);

    const apps = (await org.client.get(org.api('/applications'))).body.applications;
    expect(apps.map((a: any) => a.name)).toEqual(['Kim Lee']);
    const accepted = await org.client.post(org.api(`/applications/${apps[0].id}/accept`));
    const kim = (await org.client.get(org.api(`/volunteers/${accepted.body.id}`))).body.volunteer;
    expect(kim).toMatchObject({ name: 'Kim Lee', email: 'kim@example.com', memberCategory: 'Regular' });
    expect(kim.contactOkAt).not.toBeNull();
    expect((await org.client.get(org.api('/applications'))).body.applications).toHaveLength(0);
  });

  it('emails a group, leaving out people who unsubscribed or never agreed', async () => {
    const org = await newOrg('Message Org');
    await approve(org.orgId);
    const a = await addVolunteer(org, 'Ann');
    const b = await addVolunteer(org, 'Ben');
    await org.client.patch(org.api(`/volunteers/${b}`), { status: 'stopped' });
    const noConsent = (await org.client.post(org.api('/volunteers'), { name: 'Cy', email: 'cy@example.com' })).body.id;
    const res = await org.client.post(org.api('/messages'), { subject: 'Clinic on Saturday', body: 'We need two more coaches.', volunteerIds: [a, b, noConsent] });
    // The test server has no email provider, so nothing goes out, but the right people are chosen.
    expect(res.body).toMatchObject({ recipients: 1, skipped: 2, sent: 0, reason: 'off' });
    const rows = (await env.DB.prepare("SELECT volunteer_id FROM emails WHERE org_id = ? AND kind = 'message'").bind(org.orgId).all<any>()).results;
    expect(rows.map((r) => r.volunteer_id)).toEqual([a]);
    expect((await org.client.post(org.api('/messages'), { subject: '', body: 'x', volunteerIds: [a] })).status).toBe(400);
  });
});

const HOUR_MS = 60 * 60 * 1000;

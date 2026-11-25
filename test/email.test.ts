import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { Client, DAY, HOUR, addVolunteer, newOrg, newTask, openLink } from './helpers';
import { ORG_DAILY_LIMIT, deliver, extraLink, fromHeader, sendDueEmails } from '../src/worker/mail';
import type { Env } from '../src/worker/env';

// The test server runs without an email provider, so emails it records are
// "off". Tests that need sending call the mail code with a provider key and a
// stand-in for the provider.
const withMail = (): Env => ({ ...(env as unknown as Env), AWS_ACCESS_KEY_ID: 'AKIDEXAMPLE', AWS_SECRET_ACCESS_KEY: 'test-secret', AWS_REGION: 'us-west-2', EMAIL_FROM: 'Volley <asks@example.org>' });

function fakeProvider(ok = true) {
  const sent: any[] = [];
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const req = input instanceof Request ? input : new Request(input, init);
    if (req.url === 'https://api.resend.com/emails/batch') {
      expect(req.headers.get('authorization')).toBe('Bearer re_test');
      sent.push(...JSON.parse(await req.text()).map((m: any) => ({ ...m, via: 'resend' })));
      return new Response(ok ? '{"data":[]}' : '{"error":"no"}', { status: ok ? 200 : 422 });
    }
    expect(req.url).toBe('https://email.us-west-2.amazonaws.com/v2/email/outbound-emails');
    expect(req.headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/us-west-2\/ses\/aws4_request/);
    const b = JSON.parse(await req.text());
    sent.push({
      from: b.FromEmailAddress, to: b.Destination.ToAddresses, reply_to: b.ReplyToAddresses?.[0],
      subject: b.Content.Simple.Subject.Data, text: b.Content.Simple.Body.Text.Data,
    });
    return new Response(ok ? '{"MessageId":"x"}' : '{"message":"no"}', { status: ok ? 200 : 400 });
  });
  return { sent, spy };
}

async function emailsFor(orgId: string) {
  const { results } = await env.DB.prepare('SELECT * FROM emails WHERE org_id = ? ORDER BY created_at, kind').bind(orgId).all<any>();
  return results;
}

afterEach(() => vi.restoreAllMocks());

describe('email', () => {
  it('records an ask email for each person with an address, and keeps the copy fallback', async () => {
    const org = await newOrg();
    const sam = await addVolunteer(org, 'Sam Lee');
    const noEmail = (await org.client.post(org.api('/volunteers'), { name: 'Pat', phone: '555-0100', contactOk: true })).body.id;
    const task = await newTask(org);
    const res = await org.client.post(org.api(`/tasks/${task}/ask`), { volunteerIds: [sam, noEmail] });
    expect(res.body.asks).toHaveLength(2);
    for (const a of res.body.asks) {
      expect(a.emailed).toBe(false);
      expect(a.message).toContain(a.link);
    }
    const rows = await emailsFor(org.orgId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'ask', volunteer_id: sam, status: 'off', task_id: task });
  });

  it('sends a confirmation when someone accepts, and the answer stands if email is off', async () => {
    const org = await newOrg();
    const sam = await addVolunteer(org, 'Sam');
    const task = await newTask(org);
    const ask = (await org.client.post(org.api(`/tasks/${task}/ask`), { volunteerIds: [sam] })).body.asks[0];
    const phone = await openLink(ask.link);
    expect((await phone.post(`/api/v/asks/${ask.askId}/answer`, { answer: 'yes' })).body.result).toBe('yes');
    const kinds = (await emailsFor(org.orgId)).map((r) => r.kind);
    expect(kinds).toEqual(['ask', 'confirm']);
  });

  it('sends through the provider with the organization name and a reply address', async () => {
    const org = await newOrg('Riverside Pantry');
    const { sent } = fakeProvider();
    const statuses = await deliver(withMail(), org.orgId, [
      { kind: 'ask', to: 'sam@example.com', subject: 'Can you help?', text: 'Hi', replyTo: 'coord@example.com' },
    ], Date.now());
    expect(statuses).toEqual(['sent']);
    expect(sent[0]).toMatchObject({ from: '"Riverside Pantry" <asks@example.org>', to: ['sam@example.com'], reply_to: 'coord@example.com' });
    expect((await emailsFor(org.orgId))[0].status).toBe('sent');
  });

  it('uses Resend when its key is set, many emails in one request', async () => {
    const org = await newOrg('Riverside Pantry');
    const { sent, spy } = fakeProvider();
    const resend = { ...withMail(), RESEND_API_KEY: 're_test' };
    const statuses = await deliver(resend, org.orgId, [
      { kind: 'ask', to: 'a@example.com', subject: 's', text: 't', replyTo: 'coord@example.com' },
      { kind: 'ask', to: 'b@example.com', subject: 's', text: 't' },
    ], Date.now());
    expect(statuses).toEqual(['sent', 'sent']);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(sent[0]).toMatchObject({ via: 'resend', from: '"Riverside Pantry" <asks@example.org>', to: ['a@example.com'], reply_to: 'coord@example.com' });
  });

  it('records a refused send as failed', async () => {
    const org = await newOrg();
    fakeProvider(false);
    expect(await deliver(withMail(), org.orgId, [{ kind: 'ask', to: 'a@example.com', subject: 's', text: 't' }], Date.now())).toEqual(['failed']);
  });

  it('stops at the daily limit for an organization', async () => {
    const org = await newOrg();
    const now = Date.now();
    await env.DB.batch(
      Array.from({ length: ORG_DAILY_LIMIT - 1 }, (_, i) =>
        env.DB.prepare("INSERT INTO emails (id, org_id, kind, to_email, status, created_at) VALUES (?, ?, 'ask', 'x@example.com', 'sent', ?)").bind(`fill${org.orgId}${i}`, org.orgId, now - HOUR),
      ),
    );
    fakeProvider();
    const statuses = await deliver(withMail(), org.orgId, [
      { kind: 'ask', to: 'a@example.com', subject: 's', text: 't' },
      { kind: 'ask', to: 'b@example.com', subject: 's', text: 't' },
    ], now);
    expect(statuses).toEqual(['sent', 'limit']);
  });

  it('never emails the made-up people in a sample organization', async () => {
    const org = await newOrg();
    const sample = (await org.client.post('/api/sample', { kind: 'pantry' })).body.id;
    const { spy } = fakeProvider();
    expect(await deliver(withMail(), sample, [{ kind: 'ask', to: 'a@example.com', subject: 's', text: 't' }], Date.now())).toEqual(['off']);
    expect(spy).not.toHaveBeenCalled();
  });

  it('cleans the display name in the from address', () => {
    expect(fromHeader(withMail(), 'Evil "Org" <x@y>\r\nBcc: z')).toBe('"Evil Org x@y Bcc: z" <asks@example.org>');
  });

  it('sends one reminder the day before, and one note when a task starting soon is not full', async () => {
    const org = await newOrg('Desk Org');
    const sam = await addVolunteer(org, 'Sam');
    const start = Date.now() + 5 * DAY;
    const task = await newTask(org, { startsAt: start, endsAt: start + 2 * HOUR, peopleNeeded: 2, title: 'Registration desk' });
    const ask = (await org.client.post(org.api(`/tasks/${task}/ask`), { volunteerIds: [sam] })).body.asks[0];
    const phone = await openLink(ask.link);
    await phone.post(`/api/v/asks/${ask.askId}/answer`, { answer: 'yes' });

    const { sent } = fakeProvider();
    await sendDueEmails(withMail(), start - 20 * HOUR);
    await sendDueEmails(withMail(), start - 19 * HOUR);
    const mine = sent.filter((m) => m.from.includes('Desk Org'));
    expect(mine.map((m) => m.subject)).toEqual([expect.stringMatching(/^Reminder: Registration desk/), 'Registration desk still needs 1 person']);
    expect(mine[0].to).toEqual([expect.stringMatching(/^sam\./)]);
    expect(mine[1].text).toContain(`/o/${org.orgId}/tasks/${task}`);

    // The reminder's link opens the same ask.
    const link = mine[0].text.match(/https:\/\/app\.test\/v\/\S+/)[0];
    const reminderPhone = await openLink(link, start - 19 * HOUR);
    expect((await reminderPhone.get('/api/v/me')).status).toBe(200);
  });

  it('stops extra links working when a coordinator makes a new link', async () => {
    const org = await newOrg();
    const sam = await addVolunteer(org, 'Sam');
    const task = await newTask(org);
    const ask = (await org.client.post(org.api(`/tasks/${task}/ask`), { volunteerIds: [sam] })).body.asks[0];
    const link = await extraLink(env as unknown as Env, org.orgId, ask.askId, sam, Date.now());
    await openLink(link);
    await org.client.post(org.api(`/asks/${ask.askId}/link`));
    expect((await new Client().raw(new URL(link).pathname)).status).toBe(410);
  });
});

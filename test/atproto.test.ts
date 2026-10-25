import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client, addVolunteer, newOrg, newTask, openLink } from './helpers';

interface Call {
  url: string;
  body: any;
}

/** Stands in for Bluesky's servers: resolves the handle, signs in, stores records. */
function fakeNetwork() {
  const calls: Call[] = [];
  const records = new Map<string, any>();
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (!/bsky|plc\.directory|pds\.test/.test(url)) return realFetch(input, init);
    calls.push({ url, body });
    const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
    if (url.includes('resolveHandle')) return json({ did: 'did:plc:org123' });
    if (url.startsWith('https://plc.directory/')) {
      return json({ service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://pds.test' }] });
    }
    if (url.endsWith('createSession')) {
      if (body.password !== 'app-pass-word') return new Response(JSON.stringify({ message: 'Invalid identifier or password' }), { status: 401 });
      return json({ did: 'did:plc:org123', handle: 'chapter.example.com', accessJwt: 'jwt' });
    }
    if (url.endsWith('putRecord')) {
      const uri = `at://${body.repo}/${body.collection}/${body.rkey}`;
      records.set(uri, body.record);
      return json({ uri, cid: 'cid' });
    }
    if (url.endsWith('deleteRecord')) {
      records.delete(`at://${body.repo}/${body.collection}/${body.rkey}`);
      return json({});
    }
    return new Response('not found', { status: 404 });
  });
  return { calls, records };
}

afterEach(() => vi.restoreAllMocks());

describe('tasks on AT Protocol', () => {
  it('posts only the task, keeps it in step, and deletes it when made private', async () => {
    const net = fakeNetwork();
    const org = await newOrg('Chapter A');
    const bad = await org.client.post(org.api('/atproto'), { identifier: 'chapter.example.com', appPassword: 'wrong' });
    expect(bad.status).toBe(400);
    const ok = await org.client.post(org.api('/atproto'), { identifier: 'chapter.example.com', appPassword: 'app-pass-word' });
    expect(ok.status).toBe(200);
    expect(ok.body.account.did).toBe('did:plc:org123');

    const sam = await addVolunteer(org, 'Samantha Secretname', {}, { email: 'samantha.secret@example.com' });
    const task = await newTask(org, { peopleNeeded: 1, publish: true, placePublic: 'East Side branch', placePrivate: '99 Hidden Lane' });

    const taskUri = `at://did:plc:org123/com.example.volunteer.task/${task}`;
    expect(net.records.get(taskUri)).toMatchObject({
      $type: 'com.example.volunteer.task',
      title: 'Registration desk',
      place: 'East Side branch',
      peopleNeeded: 1,
      status: 'open',
      url: `https://app.test/t/${task}`,
    });
    const event = [...net.records.entries()].find(([k]) => k.includes('community.lexicon.calendar.event'));
    expect(event?.[1]).toMatchObject({ $type: 'community.lexicon.calendar.event', name: 'Registration desk', mode: 'community.lexicon.calendar.event#inperson' });
    expect(event?.[0].split('/').pop()).toMatch(/^[234567a-z]{13}$/);

    // A yes fills the task; the record follows.
    const ask = (await org.client.post(org.api(`/tasks/${task}/ask`), { volunteerIds: [sam] })).body.asks[0];
    const phone = await openLink(ask.link);
    await phone.post(`/api/v/asks/${ask.askId}/answer`, { answer: 'yes' });
    expect(net.records.get(taskUri).status).toBe('filled');

    // Nothing about volunteers ever left the app.
    const sent = JSON.stringify(net.calls.map((c) => c.body));
    for (const secret of ['Samantha', 'samantha.secret', '99 Hidden Lane', sam]) expect(sent).not.toContain(secret);

    // The public page shows the task and nothing private.
    const pub = await new Client().get(`/t/${task}`);
    expect(pub.status).toBe(200);
    expect(pub.text).toContain('Registration desk');
    expect(pub.text).toContain('East Side branch');
    for (const secret of ['Samantha', 'samantha.secret', '99 Hidden Lane']) expect(pub.text).not.toContain(secret);

    // Switching it to private deletes both records.
    await org.client.patch(org.api(`/tasks/${task}`), { publish: false });
    expect(net.records.size).toBe(0);
    expect((await new Client().get(`/t/${task}`)).status).toBe(404);
  });

  it('shows a posting failure on Today without blocking the coordinator', async () => {
    const net = fakeNetwork();
    const org = await newOrg();
    await org.client.post(org.api('/atproto'), { identifier: 'chapter.example.com', appPassword: 'app-pass-word' });
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('down', { status: 503 }));
    const task = await newTask(org, { publish: true });
    expect(task).toBeTruthy();
    const today = (await org.client.get(org.api('/today'))).body;
    expect(today.items).toContainEqual(expect.objectContaining({ kind: 'atproto_error', taskId: task }));
    expect(net.records.size).toBe(0);
  });
});

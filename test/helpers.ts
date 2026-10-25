import { exports } from 'cloudflare:workers';

export const BASE = 'https://app.test';
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

export interface Res<T = any> {
  status: number;
  body: T;
  headers: Headers;
  text: string;
}

/** A browser stand-in: keeps cookies and can pretend it's another time. */
export class Client {
  cookies = new Map<string, string>();
  now: number | null = null;

  async raw(path: string, init: RequestInit & { json?: unknown } = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (this.cookies.size) headers.set('cookie', [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '));
    if (this.now !== null) headers.set('x-test-now', String(this.now));
    if (init.json !== undefined) {
      headers.set('content-type', 'application/json');
      init.body = JSON.stringify(init.json);
    }
    if (init.method && init.method !== 'GET' && !headers.has('x-requested-with')) headers.set('x-requested-with', 'voluntold');
    const res = await (exports as any).default.fetch(new Request(BASE + path, { ...init, headers, redirect: 'manual' }));
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';');
      const [k, ...v] = pair.split('=');
      if (/max-age=0/i.test(c)) this.cookies.delete(k);
      else this.cookies.set(k, v.join('='));
    }
    return res;
  }

  async req<T = any>(method: string, path: string, json?: unknown): Promise<Res<T>> {
    const res = await this.raw(path, { method, json });
    const text = await res.text();
    let body: any = text;
    try {
      body = JSON.parse(text);
    } catch {
      // not JSON
    }
    return { status: res.status, body, headers: res.headers, text };
  }

  get<T = any>(path: string) {
    return this.req<T>('GET', path);
  }
  post<T = any>(path: string, json: unknown = {}) {
    return this.req<T>('POST', path, json);
  }
  patch<T = any>(path: string, json: unknown = {}) {
    return this.req<T>('PATCH', path, json);
  }
  del<T = any>(path: string) {
    return this.req<T>('DELETE', path);
  }
}

let counter = 0;
export function uniqueEmail(prefix = 'coord') {
  counter++;
  return `${prefix}${counter}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function signIn(email = uniqueEmail()): Promise<Client> {
  const c = new Client();
  const start = await c.post('/api/auth/start', { email });
  if (start.status !== 200) throw new Error(`start failed: ${start.text}`);
  const verify = await c.post('/api/auth/verify', { email, code: start.body.devCode });
  if (verify.status !== 200) throw new Error(`verify failed: ${verify.text}`);
  return c;
}

export interface Org {
  client: Client;
  orgId: string;
  fields: Record<string, string>;
  api: (path: string) => string;
}

export async function newOrg(name = 'Chapter A'): Promise<Org> {
  const client = await signIn();
  const res = await client.post('/api/orgs', { name, timeZone: 'America/New_York' });
  const orgId = res.body.id;
  const fields = await client.get(`/api/orgs/${orgId}/fields`);
  return {
    client,
    orgId,
    fields: Object.fromEntries(fields.body.fields.map((f: any) => [f.label, f.id])),
    api: (path: string) => `/api/orgs/${orgId}${path}`,
  };
}

export async function addVolunteer(org: Org, name: string, values: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  const res = await org.client.post(org.api('/volunteers'), {
    name,
    email: `${name.toLowerCase().replace(/\W+/g, '.')}.${Math.random().toString(36).slice(2, 6)}@example.com`,
    contactOk: true,
    values,
    ...extra,
  });
  if (res.status !== 201) throw new Error(`add volunteer failed: ${res.text}`);
  return res.body.id as string;
}

export async function newTask(org: Org, input: Record<string, unknown> = {}) {
  const start = (org.client.now ?? Date.now()) + 5 * DAY;
  const res = await org.client.post(org.api('/tasks'), {
    title: 'Registration desk',
    timing: 'at_time',
    startsAt: start,
    endsAt: start + 2 * HOUR,
    peopleNeeded: 2,
    requirements: [],
    askMode: 'few',
    open: true,
    ...input,
  });
  if (res.status !== 201) throw new Error(`task failed: ${res.text}`);
  return res.body.id as string;
}

/** Opens a private link in a fresh "phone" and returns that phone. */
export async function openLink(link: string, now: number | null = null): Promise<Client> {
  const phone = new Client();
  phone.now = now;
  const res = await phone.raw(new URL(link).pathname);
  if (res.status !== 302) throw new Error(`link failed with ${res.status}`);
  return phone;
}

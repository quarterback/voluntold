// The browser demo (docs/specs/browser-demo.md). The worker's own routes run in
// the page over SQLite, and the database is saved in this browser's IndexedDB.
// Nothing about the visitor's session leaves the browser, there's no sign-in,
// and each visitor has their own copy of the sample organizations.

/* eslint-disable @typescript-eslint/no-explicit-any */
import initSqlJs, { type Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { app } from '../worker/index';
import { sweep } from '../worker/engine';
import type { Env } from '../worker/env';
import { BrowserD1 } from './d1';

const g = globalThis as any;
const location = g.location as { origin: string; href: string; pathname: string; replace(url: string): void };
const IDB_NAME = 'volley-demo';
const IDB_STORE = 'db';
const REV_KEY = 'volley-demo:rev';
const SECRET_KEY = 'volley-demo:secret';
const EMAIL = 'you@example.com';
// Paths the worker answers. Everything else is a file from the build.
const SERVER_PATHS = /^\/(api|v|t)\//;

const migrations = import.meta.glob('../../migrations/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

function idb(): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = g.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDo<T>(mode: 'readonly' | 'readwrite', fn: (store: any) => any): Promise<T> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, mode);
    const req = fn(tx.objectStore(IDB_STORE));
    tx.oncomplete = () => { db.close(); resolve(req?.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

function local(key: string): string | null {
  try { return g.localStorage.getItem(key); } catch { return null; }
}
function setLocal(key: string, value: string) {
  try { g.localStorage.setItem(key, value); } catch { /* fine without it */ }
}

function secret(): string {
  let s = local(SECRET_KEY);
  if (!s) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    s = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    setLocal(SECRET_KEY, s);
  }
  return s;
}

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
let d1: BrowserD1;
let env: Env;
let rev = '';
let savedChanges = 0;

function migrate(db: Database) {
  db.run('CREATE TABLE IF NOT EXISTS demo_migrations (name TEXT PRIMARY KEY)');
  const done = new Set((db.exec('SELECT name FROM demo_migrations')[0]?.values ?? []).map((r) => String(r[0])));
  for (const path of Object.keys(migrations).sort()) {
    const name = path.split('/').pop()!;
    if (done.has(name)) continue;
    db.exec(migrations[path]);
    db.run('INSERT INTO demo_migrations (name) VALUES (?)', [name]);
  }
}

/** Opens the saved database, or a new one. */
async function open() {
  const saved = await idbDo<Uint8Array | undefined>('readonly', (s) => s.get('main')).catch(() => undefined);
  const db = new SQL.Database(saved ?? undefined);
  migrate(db);
  d1?.sqlite.close();
  d1 = new BrowserD1(db);
  env = { DB: d1 as any, ASSETS: null as any, DEV_MODE: '1', APP_URL: location.origin, APP_SECRET: secret(), ATPROTO_TASK_NSID: '' };
  rev = local(REV_KEY) ?? '';
  savedChanges = d1.totalChanges();
}

async function save() {
  // export() resets connection settings, so foreign keys go back on after it.
  const bytes = d1.sqlite.export();
  d1.sqlite.run('PRAGMA foreign_keys = ON');
  await idbDo('readwrite', (s) => s.put(bytes, 'main'));
  rev = `${Date.now()}-${Math.random()}`;
  setLocal(REV_KEY, rev);
  savedChanges = d1.totalChanges();
}

// One request at a time, so a save never interleaves with another change.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
}

/** Sends a request to the worker's routes in this page. */
export function serve(request: Request): Promise<Response> {
  return serial(async () => {
    // Another tab (the volunteer page opens in one) may have saved since.
    if ((local(REV_KEY) ?? '') !== rev) await open();
    const res = await app.fetch(request, env, { waitUntil() {}, passThroughOnException() {}, props: {} } as any);
    if (d1.totalChanges() !== savedChanges) await save();
    return res;
  });
}

function runSweep() {
  return serial(async () => {
    await sweep(env, Date.now());
    if (d1.totalChanges() !== savedChanges) await save();
  });
}

const nativeFetch = g.fetch.bind(g);

function installFetch() {
  g.fetch = (input: any, init?: any) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    if (url.origin === location.origin && SERVER_PATHS.test(url.pathname)) return serve(req);
    return nativeFetch(input, init);
  };
}

const json = (path: string, body: unknown) =>
  serve(new Request(new URL(path, location.origin), { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'voluntold' }, body: JSON.stringify(body) }));

/** The demo has no sign-in screen. The visitor is signed in as a sample person. */
async function signIn() {
  const me = await serve(new Request(new URL('/api/me', location.origin)));
  if (me.ok) return;
  const start = (await (await json('/api/auth/start', { email: EMAIL })).json()) as { devCode: string };
  await json('/api/auth/verify', { email: EMAIL, code: start.devCode });
}

/** Links the worker serves as pages: a volunteer's private link and a public task page. */
async function servePage(): Promise<boolean> {
  if (!/^\/(v|t)\//.test(location.pathname)) return false;
  const res = await serve(new Request(location.href, { redirect: 'manual' }));
  const to = res.headers.get('location');
  if (to) {
    g.history.replaceState(null, '', to);
    return false;
  }
  const html = await res.text();
  g.document.open();
  g.document.write(html);
  g.document.close();
  return true;
}

/** Export buttons link to /api/… addresses. Download them from the page instead. */
function catchDownloads() {
  g.document.addEventListener('click', async (e: any) => {
    const a = e.target?.closest?.('a[href]');
    if (!a || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return;
    e.preventDefault();
    const res = await serve(new Request(url));
    const blob = await res.blob();
    const name = /filename="?([^";]+)/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? url.pathname.split('/').pop()!;
    const link = g.document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  });
}

/** Wipes this browser's copy and starts over with fresh samples. */
async function reset() {
  await serial(async () => {
    await idbDo('readwrite', (s) => s.clear());
    try { for (const k of Object.keys(g.localStorage)) if (k.startsWith('volley-demo:') || k.startsWith('guide')) g.localStorage.removeItem(k); } catch { /* fine */ }
  });
  location.replace('/');
}

/** Resolves true when the app should render; src/web/main.tsx waits on it. */
async function boot(): Promise<boolean> {
  SQL = await initSqlJs({ locateFile: () => wasmUrl });
  await open();
  installFetch();
  g.volleyDemo = { reset };
  await signIn();
  await runSweep();
  setInterval(runSweep, 5 * 60 * 1000);
  if (await servePage()) return false;
  catchDownloads();
  return true;
}

g.volleyDemoReady = boot().catch((e) => {
  console.error(e);
  g.document.body.textContent = "The demo couldn't start in this browser. Try another browser, or leave private browsing.";
  return false;
});

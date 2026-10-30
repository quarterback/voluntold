// Stands in for hono/cookie in the browser demo. Browsers drop Cookie and
// Set-Cookie headers on Request and Response objects made in script, so the
// worker's sessions are kept in localStorage instead. Only the demo build
// aliases hono/cookie to this file.

/* eslint-disable @typescript-eslint/no-explicit-any */
const KEY = 'volley-demo:cookies';
const store = (globalThis as any).localStorage as { getItem(k: string): string | null; setItem(k: string, v: string): void };

function read(): Record<string, string> {
  try {
    return JSON.parse(store.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

function write(jar: Record<string, string>) {
  try {
    store.setItem(KEY, JSON.stringify(jar));
  } catch {
    /* private windows can refuse storage; the session then lasts this page */
  }
}

export function getCookie(_c: unknown, name?: string): any {
  const jar = read();
  return name === undefined ? jar : jar[name];
}

export function setCookie(_c: unknown, name: string, value: string, opts: { maxAge?: number } = {}) {
  const jar = read();
  if (opts.maxAge === 0) delete jar[name];
  else jar[name] = value;
  write(jar);
}

export function deleteCookie(_c: unknown, name: string) {
  const jar = read();
  delete jar[name];
  write(jar);
}

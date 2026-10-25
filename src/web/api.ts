// Fetch wrapper. Every change carries the header the server requires.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = init.method ?? (init.body === undefined ? 'GET' : 'POST');
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: {
      ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(method === 'GET' ? {} : { 'x-requested-with': 'voluntold' }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'Something went wrong. Try again.');
  return data as T;
}

export const orgApi = (orgId: string) => (path: string) => `/api/orgs/${orgId}${path}`;

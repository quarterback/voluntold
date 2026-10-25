import { HTTPException } from 'hono/http-exception';
import type { Env } from './env';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

/** Random, opaque ID. Never sequential, so shared URLs can't be guessed. */
export function newId(bytes = 12): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  let out = '';
  for (const b of data) out += ALPHABET[b & 31];
  return out;
}

/** A strong random token for private links and sessions. */
export function newToken(): string {
  const data = crypto.getRandomValues(new Uint8Array(32));
  return base64url(data);
}

export function base64url(data: Uint8Array): string {
  let s = '';
  for (const b of data) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function requireSecret(env: Env): string {
  if (!env.APP_SECRET || env.APP_SECRET.length < 16) {
    throw new HTTPException(500, { message: 'APP_SECRET is not set' });
  }
  return env.APP_SECRET;
}

async function hmacKey(env: Env): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(requireSecret(env)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/** Tokens are stored only as HMAC hashes. */
export async function hashToken(env: Env, token: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), new TextEncoder().encode(token));
  return base64url(new Uint8Array(sig));
}

async function aesKey(env: Env): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`aes:${requireSecret(env)}`));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(env: Env, plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(env), new TextEncoder().encode(plain));
  return `${base64url(iv)}.${base64url(new Uint8Array(data))}`;
}

export async function decryptSecret(env: Env, sealed: string): Promise<string> {
  const [iv, data] = sealed.split('.');
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64url(iv) },
    await aesKey(env),
    fromBase64url(data),
  );
  return new TextDecoder().decode(plain);
}

export function isDev(env: Env): boolean {
  return env.DEV_MODE === '1';
}

export function fail(status: 400 | 401 | 403 | 404 | 409 | 410 | 429 | 503, message: string): never {
  throw new HTTPException(status, { message });
}

export function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function cleanText(value: unknown, max = 2000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export function optionalText(value: unknown, max = 2000): string | null {
  const text = cleanText(value, max);
  return text === '' ? null : text;
}

export function normalizeEmail(value: unknown): string | null {
  const text = cleanText(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : null;
}

export function normalizePhone(value: unknown): string | null {
  const text = cleanText(value, 40);
  const digits = text.replace(/[^\d+]/g, '');
  return digits.replace(/\D/g, '').length >= 7 ? digits : null;
}

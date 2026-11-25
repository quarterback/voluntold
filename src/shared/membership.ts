// Membership: where each person stands, from their expiry date.

import { DAY } from './rules';

export type MembershipState = 'none' | 'current' | 'expiring' | 'expired';
export type PeopleWord = 'volunteers' | 'members' | 'participants';
export const PEOPLE_WORDS: PeopleWord[] = ['volunteers', 'members', 'participants'];

/** No expiry date means no membership to track. Expiring means within the organization's reminder window. */
export function membershipState(expiresAt: number | null, now: number, renewalDays: number): MembershipState {
  if (expiresAt === null) return 'none';
  if (expiresAt <= now) return 'expired';
  if (expiresAt <= now + Math.max(renewalDays, 30) * DAY) return 'expiring';
  return 'current';
}

/** A date from a form or a spreadsheet cell, as milliseconds. Empty clears it. */
export function parseDate(raw: unknown): number | null | 'bad' {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 'bad';
  const t = Date.parse(String(raw).trim());
  return Number.isNaN(t) ? 'bad' : t;
}

export const SIZE_BANDS = ['Under 50', '50 to 250', '250 to 1,000', 'Over 1,000'] as const;
export const CURRENT_TOOLS = ['Nothing yet', 'A spreadsheet', 'Paid software'] as const;

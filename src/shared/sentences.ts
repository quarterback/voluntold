// Status shown as a plain sentence, never a code (docs/SPEC.md, "Screens").

import type { AskStatus, Tier, Volunteer } from './types';

export const TIER_WORDS: Record<Tier, string> = { one_time: 'One time', seasonal: 'Seasonal', regular: 'Regular', core: 'Core' };

const PART_WORDS: Record<string, string> = { am: 'mornings', pm: 'afternoons', eve: 'evenings' };
const DAY_WORDS: Record<string, string> = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };

/** "Sat mornings, Thu afternoons". Empty when the person gave no usual times. */
export function usualTimesText(days: string[]): string {
  return days.map((d) => { const [dd, pp] = d.split('_'); return `${DAY_WORDS[dd]} ${PART_WORDS[pp]}`; }).join(', ');
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function ago(then: number, now: number): string {
  const diff = Math.max(0, now - then);
  if (diff < HOUR) return 'just now';
  if (diff < DAY) return plural(Math.floor(diff / HOUR), 'hour') + ' ago';
  if (diff < 14 * DAY) return plural(Math.floor(diff / DAY), 'day') + ' ago';
  if (diff < 60 * DAY) return plural(Math.floor(diff / (7 * DAY)), 'week') + ' ago';
  return plural(Math.floor(diff / (30 * DAY)), 'month') + ' ago';
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function shortDate(ms: number, timeZone?: string): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
}

export function standing(
  v: Pick<Volunteer, 'status' | 'pausedUntil' | 'pausedReason' | 'contactOkAt' | 'lastAskedAt' | 'email' | 'phone'>,
  lastAnswer: AskStatus | null,
  now: number,
): string {
  if (v.status === 'stopped') return 'Unsubscribed';
  if (v.status === 'paused' && v.pausedReason === 'no_answer') return 'Paused: 3 unanswered asks';
  if (v.status === 'paused' && v.pausedUntil && v.pausedUntil > now) return `Paused until ${shortDate(v.pausedUntil)}`;
  if (!v.email && !v.phone) return 'No email or phone';
  if (v.contactOkAt === null) return 'No consent';
  if (v.lastAskedAt === null) return 'Never asked';
  const when = `Asked ${ago(v.lastAskedAt, now)}`;
  switch (lastAnswer) {
    case 'yes':
      return `${when}, accepted`;
    case 'no':
      return `${when}, declined`;
    case 'waiting':
      return `${when}, pending`;
    case 'expired':
      return `${when}, expired`;
    case 'closed':
      return `${when}, task filled`;
    default:
      return when;
  }
}

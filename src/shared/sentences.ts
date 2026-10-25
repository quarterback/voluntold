// Status shown as a plain sentence, never a code (docs/SPEC.md, "Screens").

import type { AskStatus, Volunteer } from './types';

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
  if (v.status === 'stopped') return 'Asked not to be contacted';
  if (v.status === 'paused' && v.pausedReason === 'no_answer') return 'Paused: no answer to 3 asks';
  if (v.status === 'paused' && v.pausedUntil && v.pausedUntil > now) return `On a break until ${shortDate(v.pausedUntil)}`;
  if (!v.email && !v.phone) return 'No email or phone';
  if (v.contactOkAt === null) return "Hasn't agreed to be contacted";
  if (v.lastAskedAt === null) return 'Never asked';
  const when = `Asked ${ago(v.lastAskedAt, now)}`;
  switch (lastAnswer) {
    case 'yes':
      return `${when}, said yes`;
    case 'no':
      return `${when}, said no`;
    case 'waiting':
      return `${when}, no answer yet`;
    case 'expired':
      return `${when}, didn't answer`;
    case 'closed':
      return `${when}, filled first`;
    default:
      return when;
  }
}

import { day, timeRange } from '../shared/time';
export { ago, shortDate, standing } from '../shared/sentences';

export function when(t: { timing: string; startsAt: number | null; endsAt: number | null; dueAt: number | null }, timeZone?: string): string {
  if (t.timing === 'at_time' && t.startsAt && t.endsAt) return `${day(t.startsAt, timeZone)}, ${timeRange(t.startsAt, t.endsAt, timeZone)}`;
  if (t.timing === 'by_date' && t.dueAt) return `Due ${day(t.dueAt, timeZone)}`;
  return 'No date';
}

export function toLocalInput(ms: number | null): string {
  if (!ms) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toLocalDate(ms: number | null): string {
  return toLocalInput(ms).slice(0, 10);
}

export const REASON_TEXT: Record<string, string> = {
  requirements: 'Missing requirement',
  no_contact_ok: 'No consent',
  paused: 'Paused',
  stopped: 'Unsubscribed',
  weekly_limit: 'Weekly limit reached',
  busy: 'Schedule conflict',
  unavailable: 'Outside availability',
  already_asked: 'Already asked',
};

export const STATUS_TEXT: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  filled: 'Full',
  canceled: 'Canceled',
  done: 'Completed',
};

export const TIER_TEXT: Record<string, string> = {
  one_time: 'One time',
  seasonal: 'Seasonal',
  regular: 'Regular',
  core: 'Core',
};

export const PART_TEXT: Record<string, string> = { am: 'mornings', pm: 'afternoons', eve: 'evenings' };
export const DAY_TEXT: Record<string, string> = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };

/** "Sat mornings, Thu afternoons". Empty when the person gave no usual times. */
export function usualTimes(days: string[]): string {
  return days.map((d) => { const [dd, pp] = d.split('_'); return `${DAY_TEXT[dd]} ${PART_TEXT[pp]}`; }).join(', ');
}

/** "1 hr", "90 min". */
export function effortText(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes % 60 === 0) return `${minutes / 60} hr`;
  return `${minutes} min`;
}

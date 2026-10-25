import { day, timeRange } from '../shared/time';
export { ago, shortDate, standing } from '../shared/sentences';

export function when(t: { timing: string; startsAt: number | null; endsAt: number | null; dueAt: number | null }): string {
  if (t.timing === 'at_time' && t.startsAt && t.endsAt) return `${day(t.startsAt)}, ${timeRange(t.startsAt, t.endsAt)}`;
  if (t.timing === 'by_date' && t.dueAt) return `Due ${day(t.dueAt)}`;
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
  requirements: 'Missing a requirement',
  no_contact_ok: "Hasn't agreed to be contacted",
  paused: 'Paused',
  stopped: 'Asked not to be contacted',
  weekly_limit: 'Asked enough this week',
  busy: 'Busy then',
  already_asked: 'Already asked',
};

export const STATUS_TEXT: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  filled: 'Full',
  canceled: 'Canceled',
  done: 'Done',
};

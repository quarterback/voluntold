// The rules for who fits a task, who goes first, and when things expire or
// finish. These are plain functions so tests can check them without a
// database. The server is the only place they are enforced.

import type { Field, FieldValue, Requirement, Task, Volunteer } from './types';

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
export const ASK_ANSWER_WINDOW = 48 * HOUR;
export const ASK_CLOSE_BEFORE_START = 6 * HOUR;
export const LINK_LIFETIME = 60 * DAY;
export const UNANSWERED_PAUSE_AFTER = 3;

function asList(value: FieldValue | undefined): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Whether one volunteer meets one requirement. */
export function meetsRequirement(
  volunteer: Pick<Volunteer, 'values' | 'teamIds'>,
  requirement: Requirement,
  fields: Field[],
): boolean {
  if (requirement.kind === 'team') return volunteer.teamIds.includes(requirement.teamId);

  const field = fields.find((f) => f.id === requirement.fieldId);
  if (!field) return false;
  const value = volunteer.values[field.id];
  const wanted = requirement.value;

  switch (requirement.op) {
    case 'isYes':
      return value === true || (typeof value === 'string' && /^(yes|y|true|1)$/i.test(value.trim()));
    case 'is':
      return wanted !== undefined && asList(value).some((v) => sameText(v, String(wanted)));
    case 'includes':
      return wanted !== undefined && asList(value).some((v) => sameText(v, String(wanted)));
    case 'atLeast':
    case 'atMost': {
      if (wanted === undefined) return false;
      const compare = rank(field, value) - rank(field, wanted);
      if (Number.isNaN(compare)) return false;
      return requirement.op === 'atLeast' ? compare >= 0 : compare <= 0;
    }
  }
}

// Numbers compare as numbers, dates as dates, and one-choice fields by the
// order the organization listed the options in ("New" < "Can lead").
function rank(field: Field, value: FieldValue | string | number | undefined): number {
  if (value === null || value === undefined || value === '') return NaN;
  if (field.type === 'number') return Number(value);
  if (field.type === 'date') return Date.parse(String(value));
  if (field.type === 'one') {
    const index = field.options.findIndex((o) => sameText(o, String(value)));
    return index === -1 ? NaN : index;
  }
  return NaN;
}

export function meetsAll(
  volunteer: Pick<Volunteer, 'values' | 'teamIds'>,
  requirements: Requirement[],
  fields: Field[],
): boolean {
  return requirements.every((r) => meetsRequirement(volunteer, r, fields));
}

/** A time span a volunteer is already holding a spot in. */
export interface Busy {
  start: number;
  end: number;
}

export function taskSpan(task: Pick<Task, 'timing' | 'startsAt' | 'endsAt'>): Busy | null {
  if (task.timing !== 'at_time' || task.startsAt === null || task.endsAt === null) return null;
  return { start: task.startsAt, end: task.endsAt };
}

export interface FitContext {
  now: number;
  weeklyLimit: number;
  /** Asks this volunteer received in the 7 days before now. */
  asksLast7Days: number;
  /** Times of tasks this volunteer is already holding a spot in. */
  busy: Busy[];
  /** Already asked about this task. */
  alreadyAsked: boolean;
  /** The organization's time zone, for matching usual days. */
  timeZone?: string;
}

export type NoFitReason =
  | 'requirements'
  | 'no_contact_ok'
  | 'paused'
  | 'stopped'
  | 'weekly_limit'
  | 'busy'
  | 'unavailable'
  | 'already_asked';

/** Returns null when the volunteer can be asked, or the first reason they can't. */
export function whyNotFit(
  volunteer: Volunteer,
  task: Task,
  fields: Field[],
  ctx: FitContext,
): NoFitReason | null {
  if (ctx.alreadyAsked) return 'already_asked';
  if (volunteer.status === 'stopped') return 'stopped';
  if (volunteer.status === 'paused' && !pauseOver(volunteer, ctx.now)) return 'paused';
  if (volunteer.contactOkAt === null) return 'no_contact_ok';
  if (!meetsAll(volunteer, task.requirements, fields)) return 'requirements';
  if (ctx.asksLast7Days >= ctx.weeklyLimit) return 'weekly_limit';
  const span = taskSpan(task);
  if (span && ctx.busy.some((b) => b.start < span.end && span.start < b.end)) return 'busy';
  if (!available(volunteer, task, ctx.timeZone)) return 'unavailable';
  return null;
}

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export const PART_KEYS = ['am', 'pm', 'eve'] as const;

/** "sat_am" for a Saturday morning in the given time zone. Mornings end at noon, afternoons at 5pm. */
export function slotOf(ms: number, timeZone?: string): string {
  const f = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', hour12: false, timeZone });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const hour = Number(p.hour) % 24;
  const part = hour < 12 ? 'am' : hour < 17 ? 'pm' : 'eve';
  return `${String(p.weekday).slice(0, 3).toLowerCase()}_${part}`;
}

/** How long the work takes, in minutes, if known. */
export function effortOf(task: Pick<Task, 'timing' | 'startsAt' | 'endsAt' | 'effortMinutes'>): number | null {
  if (task.effortMinutes) return task.effortMinutes;
  const span = taskSpan(task);
  return span ? Math.round((span.end - span.start) / 60000) : null;
}

/**
 * Whether the work fits the time the person said they have. Work longer than
 * their hours a week doesn't fit. Remote work fits any day. In-person work at
 * a set time must fall in one of their usual times, when they gave any.
 */
export function available(
  volunteer: Pick<Volunteer, 'days' | 'hoursWeek' | 'remoteOk'>,
  task: Pick<Task, 'timing' | 'startsAt' | 'endsAt' | 'remote' | 'effortMinutes'>,
  timeZone?: string,
): boolean {
  const effort = effortOf(task);
  if (volunteer.hoursWeek !== null && volunteer.hoursWeek !== undefined && effort !== null && effort > volunteer.hoursWeek * 60) return false;
  if (task.remote) return true;
  const span = taskSpan(task);
  if (!span || volunteer.days.length === 0) return true;
  return volunteer.days.includes(slotOf(span.start, timeZone));
}

export function pauseOver(volunteer: Pick<Volunteer, 'status' | 'pausedUntil'>, now: number): boolean {
  return volunteer.status === 'paused' && volunteer.pausedUntil !== null && volunteer.pausedUntil <= now;
}

/** Longest since last asked goes first. Never asked goes before everyone. */
export function byLongestWait<T extends { lastAskedAt: number | null; name: string }>(a: T, b: T): number {
  if (a.lastAskedAt === null && b.lastAskedAt !== null) return -1;
  if (b.lastAskedAt === null && a.lastAskedAt !== null) return 1;
  const diff = (a.lastAskedAt ?? 0) - (b.lastAskedAt ?? 0);
  return diff !== 0 ? diff : a.name.localeCompare(b.name);
}

/** How many people "A few at a time" asks in one group. */
export function batchSize(task: Pick<Task, 'askBatch' | 'peopleNeeded'>, openSpots: number): number {
  if (task.askBatch && task.askBatch > 0) return task.askBatch;
  return Math.max(1, openSpots * 2);
}

/** An ask can be answered for 48 hours, or until 6 hours before the task starts. */
export function askExpiry(task: Pick<Task, 'timing' | 'startsAt'>, now: number): number {
  const byWindow = now + ASK_ANSWER_WINDOW;
  if (task.timing === 'at_time' && task.startsAt !== null) {
    return Math.max(now, Math.min(byWindow, task.startsAt - ASK_CLOSE_BEFORE_START));
  }
  return byWindow;
}

/** When a task's time has passed, its work is done. */
export function finishedAt(task: Pick<Task, 'timing' | 'endsAt' | 'dueAt'>): number | null {
  if (task.timing === 'at_time') return task.endsAt;
  if (task.timing === 'by_date') return task.dueAt;
  return null;
}

export function requirementText(requirement: Requirement, fields: Field[], teamName: (id: string) => string): string {
  if (requirement.kind === 'team') return `Team: ${teamName(requirement.teamId)}`;
  const field = fields.find((f) => f.id === requirement.fieldId);
  const label = field?.label ?? 'Unknown field';
  switch (requirement.op) {
    case 'isYes':
      return label;
    case 'is':
      return `${label} is ${requirement.value}`;
    case 'includes':
      return `${label} includes ${requirement.value}`;
    case 'atLeast':
      return `${label} is ${requirement.value} or more`;
    case 'atMost':
      return `${label} is ${requirement.value} or less`;
  }
}

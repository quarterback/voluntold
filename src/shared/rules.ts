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
}

export type NoFitReason =
  | 'requirements'
  | 'no_contact_ok'
  | 'paused'
  | 'stopped'
  | 'weekly_limit'
  | 'busy'
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
  return null;
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
  if (requirement.kind === 'team') return `On the ${teamName(requirement.teamId)} team`;
  const field = fields.find((f) => f.id === requirement.fieldId);
  const label = field?.label ?? 'Unknown detail';
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

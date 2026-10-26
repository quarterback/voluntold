// Shared shapes for the building blocks in docs/SPEC.md.

export type FieldType = 'text' | 'number' | 'date' | 'one' | 'many' | 'yesno';

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  options: string[];
  position: number;
}

export type FieldValue = string | number | boolean | string[] | null;

export type VolunteerStatus = 'active' | 'paused' | 'stopped';

export interface Volunteer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contactOkAt: number | null;
  status: VolunteerStatus;
  pausedUntil: number | null;
  pausedReason: string | null;
  values: Record<string, FieldValue>;
  teamIds: string[];
  lastAskedAt: number | null;
  unansweredStreak: number;
  tier: Tier | null;
  /** Hours a week the person can give, if they said. */
  hoursWeek: number | null;
  /** Usual times, as day and part of day: "sat_am", "tue_eve". Empty means any time. */
  days: string[];
  remoteOk: boolean;
  createdAt: number;
}

export type Tier = 'one_time' | 'seasonal' | 'regular' | 'core';

export interface TaskFile {
  name: string;
  url: string;
}

export type RequirementOp = 'is' | 'includes' | 'atLeast' | 'atMost' | 'isYes';

export type Requirement =
  | { kind: 'field'; fieldId: string; op: RequirementOp; value?: string | number }
  | { kind: 'team'; teamId: string };

export type Timing = 'at_time' | 'by_date' | 'none';
export type AskMode = 'few' | 'everyone' | 'hand';
export type TaskStatus = 'draft' | 'open' | 'filled' | 'canceled' | 'done';

export interface Task {
  id: string;
  teamId: string | null;
  title: string;
  description: string;
  contact: string;
  timing: Timing;
  startsAt: number | null;
  endsAt: number | null;
  dueAt: number | null;
  placePublic: string;
  placePrivate: string;
  peopleNeeded: number;
  requirements: Requirement[];
  askMode: AskMode;
  askBatch: number | null;
  askWaitHours: number;
  nextRoundAt: number | null;
  publish: boolean;
  status: TaskStatus;
  needId: string | null;
  remote: boolean;
  effortMinutes: number | null;
  bring: string;
  files: TaskFile[];
}

export type Taggable = 'volunteer' | 'task' | 'need';

export interface Tag {
  id: string;
  name: string;
  color: import('./tags').TagColor;
  /** Made by the model and not yet seen by a coordinator. */
  isNew: boolean;
  createdAt: number;
}

export type AskStatus = 'waiting' | 'yes' | 'no' | 'expired' | 'closed';
export type SpotStatus = 'holding' | 'cant' | 'done' | 'missed';
export type Role = 'admin' | 'coordinator' | 'lead';

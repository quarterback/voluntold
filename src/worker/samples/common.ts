// What every sample organization is made of. Each dataset in this folder fills
// in the people and tells its story with the helpers in Ctx; sample.ts turns
// that into rows.

import type { FieldType } from '../../shared/types';

export type Person = {
  name: string;
  skills: string[];
  exp: 'New' | 'Has done it before' | 'Can lead';
  tier: 'one_time' | 'seasonal' | 'regular' | 'core';
  days: string[];
  hours: number | null;
  remote: boolean;
  /** Days ago. */
  joined: number;
  /** Days ago. Leave out for someone never asked. */
  asked?: number;
  /** Values for the dataset's extra fields, by label. */
  extra?: Record<string, string | string[]>;
};

export interface Ctx {
  now: number;
  /** Milliseconds for a wall-clock time in the sample's time zone, `days` from today. */
  at(days: number, hour: number, minute?: number): number;
  /** Days from today to the next given weekday (0 Sunday). Never today. */
  until(weekday: number): number;
  /** A requirement on a field, by label. */
  req(field: string, op: 'is' | 'includes' | 'isYes', value?: string): unknown;
  /** The id of a tag by name. */
  tag(name: string): string;
  task(t: {
    title: string; desc?: string; contact?: string; start?: number; end?: number; due?: number; place?: string; address?: string; people: number;
    reqs?: unknown[]; status: 'draft' | 'open' | 'filled' | 'done' | 'canceled'; need?: string | null; remote?: boolean; effort?: number; bring?: string;
    files?: { name: string; url: string }[]; nextRound?: number | null; tags?: string[]; publish?: boolean;
  }): string;
  ask(taskId: string, name: string, status: 'waiting' | 'yes' | 'no' | 'expired' | 'closed', created: number, batch: number, spot?: 'holding' | 'done' | 'missed' | 'cant'): Promise<void>;
  need(n: { title: string; startsAt: number | null; repeat?: 'none' | 'weekly' | 'monthly'; status: 'draft' | 'active' | 'done'; created: number; tags?: string[] }): string;
  item(needId: string, kind: 'supply' | 'info', title: string, detail: string, status?: 'needed' | 'covered'): void;
  report(spotTask: string, name: string, body: string, created: number): void;
}

export interface Dataset {
  kind: string;
  name: string;
  tz: string;
  /** The options on the starter Skills field. */
  skills: string[];
  /** Fields beyond the four starters. */
  extraFields?: { label: string; type: FieldType; options: string[] }[];
  /** Tags as the model would have left them: a settled set, and fresh ones nobody has looked at, one a duplicate to merge. */
  tags: { settled: string[]; fresh: string[] };
  tagsFor(p: Person): string[];
  people: Person[];
  /** Who is paused: one after three unanswered asks, one by their own choice. */
  paused?: { noAnswer?: string; byChoice?: string };
  teams: { name: string; has(p: Person): boolean }[];
  /** The default contact line on tasks. */
  contact: string;
  /** The import on record. */
  import: { fileName: string; added: number; merged: number; setAside: { row: number; cells: Record<string, string>; reason: string }[] };
  story(ctx: Ctx): Promise<void>;
  /** A partner organization that can take open work. */
  partner?: { name: string; skills: string[]; people: [string, string[]][] };
}

export const DAY_TEXT: Record<string, string> = {
  mon_am: 'Monday mornings', mon_pm: 'Monday afternoons', mon_eve: 'Monday evenings',
  tue_am: 'Tuesday mornings', tue_pm: 'Tuesday afternoons', tue_eve: 'Tuesday evenings',
  wed_am: 'Wednesday mornings', wed_pm: 'Wednesday afternoons', wed_eve: 'Wednesday evenings',
  thu_am: 'Thursday mornings', thu_pm: 'Thursday afternoons', thu_eve: 'Thursday evenings',
  fri_am: 'Friday mornings', fri_pm: 'Friday afternoons', fri_eve: 'Friday evenings',
  sat_am: 'Saturday mornings', sat_pm: 'Saturday afternoons', sat_eve: 'Saturday evenings',
  sun_am: 'Sunday mornings', sun_pm: 'Sunday afternoons', sun_eve: 'Sunday evenings',
};

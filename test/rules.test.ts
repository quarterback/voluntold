import { describe, expect, it } from 'vitest';
import { askExpiry, batchSize, byLongestWait, meetsRequirement, whyNotFit, DAY, HOUR } from '../src/shared/rules';
import type { Field, Task, Volunteer } from '../src/shared/types';
import { time, timeRange } from '../src/shared/time';

const fields: Field[] = [
  { id: 'skills', label: 'Skills', type: 'many', options: ['Audio', 'Design'], position: 0 },
  { id: 'exp', label: 'Experience', type: 'one', options: ['New', 'Has done it before', 'Can lead'], position: 1 },
  { id: 'age', label: 'Age', type: 'number', options: [], position: 2 },
  { id: 'food', label: 'Food safety training', type: 'yesno', options: [], position: 3 },
];

function volunteer(over: Partial<Volunteer> = {}): Volunteer {
  return {
    id: 'v',
    name: 'Sam',
    email: 'sam@example.com',
    phone: null,
    contactOkAt: 1,
    status: 'active',
    pausedUntil: null,
    pausedReason: null,
    values: { skills: ['Audio'], exp: 'Has done it before', age: 30, food: true },
    teamIds: ['desk'],
    lastAskedAt: null,
    unansweredStreak: 0,
    ...over,
  };
}

const now = Date.UTC(2026, 9, 25, 12);
function task(over: Partial<Task> = {}): Task {
  return {
    id: 't',
    teamId: null,
    title: 'Desk',
    description: '',
    contact: '',
    timing: 'at_time',
    startsAt: now + 3 * DAY,
    endsAt: now + 3 * DAY + 2 * HOUR,
    dueAt: null,
    placePublic: '',
    placePrivate: '',
    peopleNeeded: 2,
    requirements: [],
    askMode: 'few',
    askBatch: null,
    askWaitHours: 24,
    nextRoundAt: null,
    publish: false,
    status: 'open',
    ...over,
  };
}

const ctx = { now, weeklyLimit: 2, asksLast7Days: 0, busy: [], alreadyAsked: false };

describe('requirements', () => {
  it('matches choice fields by text, ignoring case', () => {
    expect(meetsRequirement(volunteer(), { kind: 'field', fieldId: 'skills', op: 'includes', value: 'audio' }, fields)).toBe(true);
    expect(meetsRequirement(volunteer(), { kind: 'field', fieldId: 'skills', op: 'includes', value: 'Design' }, fields)).toBe(false);
  });

  it('orders one-choice options the way the organization listed them', () => {
    const atLeast = (value: string) => meetsRequirement(volunteer(), { kind: 'field', fieldId: 'exp', op: 'atLeast', value }, fields);
    expect(atLeast('New')).toBe(true);
    expect(atLeast('Has done it before')).toBe(true);
    expect(atLeast('Can lead')).toBe(false);
  });

  it('compares numbers and yes/no fields', () => {
    expect(meetsRequirement(volunteer(), { kind: 'field', fieldId: 'age', op: 'atLeast', value: 18 }, fields)).toBe(true);
    expect(meetsRequirement(volunteer({ values: { age: 16 } }), { kind: 'field', fieldId: 'age', op: 'atLeast', value: 18 }, fields)).toBe(false);
    expect(meetsRequirement(volunteer(), { kind: 'field', fieldId: 'food', op: 'isYes' }, fields)).toBe(true);
    expect(meetsRequirement(volunteer({ values: {} }), { kind: 'field', fieldId: 'food', op: 'isYes' }, fields)).toBe(false);
  });

  it('checks team membership', () => {
    expect(meetsRequirement(volunteer(), { kind: 'team', teamId: 'desk' }, fields)).toBe(true);
    expect(meetsRequirement(volunteer(), { kind: 'team', teamId: 'sound' }, fields)).toBe(false);
  });

  it('fails a rule that names a missing field', () => {
    expect(meetsRequirement(volunteer(), { kind: 'field', fieldId: 'gone', op: 'is', value: 'x' }, fields)).toBe(false);
  });
});

describe('who fits', () => {
  it('fits an active person who meets every requirement', () => {
    expect(whyNotFit(volunteer(), task(), fields, ctx)).toBeNull();
  });

  it('gives the reason someone does not fit', () => {
    expect(whyNotFit(volunteer({ status: 'stopped' }), task(), fields, ctx)).toBe('stopped');
    expect(whyNotFit(volunteer({ status: 'paused', pausedUntil: now + DAY }), task(), fields, ctx)).toBe('paused');
    expect(whyNotFit(volunteer({ contactOkAt: null }), task(), fields, ctx)).toBe('no_contact_ok');
    expect(whyNotFit(volunteer(), task(), fields, { ...ctx, asksLast7Days: 2 })).toBe('weekly_limit');
    expect(whyNotFit(volunteer(), task(), fields, { ...ctx, alreadyAsked: true })).toBe('already_asked');
    expect(
      whyNotFit(volunteer(), task({ requirements: [{ kind: 'field', fieldId: 'exp', op: 'is', value: 'Can lead' }] }), fields, ctx),
    ).toBe('requirements');
  });

  it('treats a break that has ended as over', () => {
    expect(whyNotFit(volunteer({ status: 'paused', pausedUntil: now - 1 }), task(), fields, ctx)).toBeNull();
  });

  it('does not ask someone already holding a spot at the same time', () => {
    const t = task();
    expect(whyNotFit(volunteer(), t, fields, { ...ctx, busy: [{ start: t.startsAt! + HOUR, end: t.endsAt! + HOUR }] })).toBe('busy');
    expect(whyNotFit(volunteer(), t, fields, { ...ctx, busy: [{ start: t.endsAt!, end: t.endsAt! + HOUR }] })).toBeNull();
  });
});

describe('who goes first', () => {
  it('puts never asked first, then longest since asked', () => {
    const people = [
      { name: 'Recent', lastAskedAt: now - DAY },
      { name: 'Never', lastAskedAt: null },
      { name: 'Long ago', lastAskedAt: now - 30 * DAY },
    ];
    expect(people.sort(byLongestWait).map((p) => p.name)).toEqual(['Never', 'Long ago', 'Recent']);
  });
});

describe('timing', () => {
  it('asks twice as many people as open spots by default', () => {
    expect(batchSize(task(), 2)).toBe(4);
    expect(batchSize(task({ askBatch: 3 }), 2)).toBe(3);
  });

  it('expires an ask after 48 hours, or 6 hours before the start', () => {
    expect(askExpiry(task({ startsAt: now + 10 * DAY }), now)).toBe(now + 48 * HOUR);
    expect(askExpiry(task({ startsAt: now + 24 * HOUR }), now)).toBe(now + 18 * HOUR);
    expect(askExpiry(task({ timing: 'by_date', startsAt: null }), now)).toBe(now + 48 * HOUR);
  });
});

describe('times in Adobe style', () => {
  const at = (h: number, m = 0) => Date.UTC(2026, 9, 29, h, m);
  it('drops :00 and uses lowercase am and pm with no space', () => {
    expect(time(at(12), 'UTC')).toBe('12pm');
    expect(time(at(9, 30), 'UTC')).toBe('9:30am');
  });
  it('writes a range with "to", sharing am or pm when both match', () => {
    expect(timeRange(at(12), at(14), 'UTC')).toBe('12 to 2pm');
    expect(timeRange(at(11, 30), at(13), 'UTC')).toBe('11:30am to 1pm');
  });
});

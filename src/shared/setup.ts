// The setup guide: the few steps that take a new organization from an empty
// account to its first ask. Each step finishes on its own when the
// organization's data shows it happened, so nobody ticks a box.

export const SETUP_STEPS = ['org', 'details', 'people', 'task', 'ask', 'admin'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/** Steps a person can skip. The rest are the point of the tool. */
export const SKIPPABLE: SetupStep[] = ['details', 'admin'];

export interface SetupSaved {
  hidden?: boolean;
  skipped?: SetupStep[];
  /** Steps with nothing to count, finished by opening their screen. */
  seen?: SetupStep[];
}

export interface SetupCounts {
  people: number;
  tasks: number;
  asks: number;
  admins: number;
}

export interface SetupState {
  steps: { key: SetupStep; done: boolean; skipped: boolean }[];
  done: number;
  total: number;
  /** Every step is done or skipped. */
  finished: boolean;
  hidden: boolean;
  /** The first step still to do. */
  next: SetupStep | null;
}

export function setupState(counts: SetupCounts, saved: SetupSaved): SetupState {
  const seen = new Set(saved.seen ?? []);
  const skippedSet = new Set(saved.skipped ?? []);
  const isDone: Record<SetupStep, boolean> = {
    org: true,
    details: seen.has('details') || counts.people > 0,
    people: counts.people > 0,
    task: counts.tasks > 0,
    ask: counts.asks > 0,
    admin: counts.admins > 1,
  };
  const steps = SETUP_STEPS.map((key) => ({ key, done: isDone[key], skipped: !isDone[key] && skippedSet.has(key) }));
  const done = steps.filter((s) => s.done).length;
  return {
    steps,
    done,
    total: steps.length,
    finished: steps.every((s) => s.done || s.skipped),
    hidden: saved.hidden === true,
    next: steps.find((s) => !s.done && !s.skipped)?.key ?? null,
  };
}

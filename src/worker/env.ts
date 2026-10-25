export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  DEV_MODE: string;
  APP_URL: string;
  APP_SECRET: string;
  ATPROTO_TASK_NSID: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  MODEL_PROVIDER?: string;
  MODEL_API_KEY?: string;
  MODEL_NAME?: string;
  MODEL_BASE_URL?: string;
}

export interface Actor {
  userId: string;
  email: string;
  memberId: string;
  orgId: string;
  role: 'admin' | 'coordinator' | 'lead';
  /** Teams this member leads. */
  leadTeamIds: string[];
}

export interface VolunteerActor {
  orgId: string;
  volunteerId: string;
  askId: string;
}

export type AppBindings = {
  Bindings: Env;
  Variables: { now: number; actor: Actor; userId: string; email: string; volunteer: VolunteerActor };
};

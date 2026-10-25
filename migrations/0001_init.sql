-- The building blocks from docs/SPEC.md. Every row that belongs to an
-- organization carries org_id, and every query filters on it.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE login_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);

CREATE TABLE orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  weekly_ask_limit INTEGER NOT NULL DEFAULT 2,
  signup_url TEXT,
  publish_default INTEGER NOT NULL DEFAULT 1,
  time_zone TEXT NOT NULL DEFAULT 'UTC',
  atproto_did TEXT,
  atproto_handle TEXT,
  atproto_service TEXT,
  atproto_secret_enc TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'coordinator', 'lead')),
  created_at INTEGER NOT NULL,
  UNIQUE (org_id, user_id)
);

CREATE TABLE fields (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'one', 'many', 'yesno')),
  options_json TEXT NOT NULL DEFAULT '[]',
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX fields_org ON fields(org_id);

CREATE TABLE imports (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  column_map_json TEXT NOT NULL,
  added INTEGER NOT NULL,
  merged INTEGER NOT NULL,
  set_aside_json TEXT NOT NULL DEFAULT '[]',
  set_aside_cleared INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE volunteers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  contact_ok_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
  paused_until INTEGER,
  paused_reason TEXT,
  values_json TEXT NOT NULL DEFAULT '{}',
  last_asked_at INTEGER,
  unanswered_streak INTEGER NOT NULL DEFAULT 0,
  import_id TEXT,
  did TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX volunteers_org ON volunteers(org_id);

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE team_members (
  team_id TEXT NOT NULL REFERENCES teams(id),
  volunteer_id TEXT NOT NULL REFERENCES volunteers(id),
  org_id TEXT NOT NULL,
  PRIMARY KEY (team_id, volunteer_id)
);

CREATE TABLE team_leads (
  team_id TEXT NOT NULL REFERENCES teams(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  org_id TEXT NOT NULL,
  PRIMARY KEY (team_id, member_id)
);

CREATE TABLE lists (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  name TEXT NOT NULL,
  filter_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  team_id TEXT REFERENCES teams(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  timing TEXT NOT NULL CHECK (timing IN ('at_time', 'by_date', 'none')),
  starts_at INTEGER,
  ends_at INTEGER,
  due_at INTEGER,
  place_public TEXT NOT NULL DEFAULT '',
  place_private TEXT NOT NULL DEFAULT '',
  people_needed INTEGER NOT NULL CHECK (people_needed > 0),
  requirements_json TEXT NOT NULL DEFAULT '[]',
  ask_mode TEXT NOT NULL DEFAULT 'few' CHECK (ask_mode IN ('few', 'everyone', 'hand')),
  ask_batch INTEGER,
  ask_wait_hours INTEGER NOT NULL DEFAULT 24,
  next_round_at INTEGER,
  publish INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'filled', 'canceled', 'done')),
  at_uri TEXT,
  at_event_uri TEXT,
  at_error TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX tasks_org ON tasks(org_id, status);

CREATE TABLE asks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  task_id TEXT NOT NULL REFERENCES tasks(id),
  volunteer_id TEXT NOT NULL REFERENCES volunteers(id),
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'yes', 'no', 'expired', 'closed')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  link_expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  answered_at INTEGER,
  UNIQUE (task_id, volunteer_id)
);
CREATE INDEX asks_org_volunteer ON asks(org_id, volunteer_id, created_at);

CREATE TABLE spots (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  task_id TEXT NOT NULL REFERENCES tasks(id),
  volunteer_id TEXT NOT NULL REFERENCES volunteers(id),
  ask_id TEXT REFERENCES asks(id),
  status TEXT NOT NULL DEFAULT 'holding' CHECK (status IN ('holding', 'cant', 'done', 'missed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX spots_task ON spots(task_id, status);

-- Sessions created when a volunteer opens a private link. The link's token
-- is exchanged for one of these and removed from the address bar.
CREATE TABLE volunteer_sessions (
  id_hash TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  volunteer_id TEXT NOT NULL,
  ask_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  actor_kind TEXT NOT NULL,
  actor_id TEXT,
  verb TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX events_org ON events(org_id, at);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

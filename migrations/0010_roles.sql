-- Roles with terms, and optional renewals
-- (docs/decisions/0015-roles-and-succession.md).

-- Renewals and dues are off until an organization turns them on. Organizations
-- that already have expiry dates keep them on.
ALTER TABLE orgs ADD COLUMN track_renewals INTEGER NOT NULL DEFAULT 0;
UPDATE orgs SET track_renewals = 1 WHERE id IN (SELECT DISTINCT org_id FROM volunteers WHERE member_expires_at IS NOT NULL);

-- A job someone holds: chair, treasurer, committee member, team captain.
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  team_id TEXT,
  -- What the role is responsible for.
  responsibilities TEXT NOT NULL DEFAULT '',
  -- What the current holder wants the next one to know.
  handoff TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX roles_org ON roles(org_id);

-- Who held a role and when. The current holder's term has no ended_at.
CREATE TABLE role_terms (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  volunteer_id TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  -- When the term is due to end, if it has a set length.
  ends_at INTEGER,
  -- When it actually ended.
  ended_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX role_terms_role ON role_terms(role_id, ended_at);
CREATE INDEX role_terms_volunteer ON role_terms(org_id, volunteer_id);

-- Work that belongs to a role, so it passes to the next holder.
ALTER TABLE tasks ADD COLUMN role_id TEXT;

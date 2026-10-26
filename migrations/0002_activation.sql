-- Activation demo (docs/decisions/0010): needs, availability, tiers, batches,
-- first offers, problem reports and partner organizations.

ALTER TABLE volunteers ADD COLUMN tier TEXT;
ALTER TABLE volunteers ADD COLUMN hours_week INTEGER;
ALTER TABLE volunteers ADD COLUMN days_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE volunteers ADD COLUMN remote_ok INTEGER NOT NULL DEFAULT 0;

ALTER TABLE tasks ADD COLUMN need_id TEXT;
ALTER TABLE tasks ADD COLUMN remote INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN effort_minutes INTEGER;
ALTER TABLE tasks ADD COLUMN bring TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN files_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE asks ADD COLUMN batch_no INTEGER NOT NULL DEFAULT 1;

CREATE TABLE needs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  title TEXT NOT NULL,
  starts_at INTEGER,
  repeat TEXT NOT NULL DEFAULT 'none' CHECK (repeat IN ('none', 'weekly', 'monthly')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'done')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX needs_org ON needs(org_id, status);

CREATE TABLE need_items (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  need_id TEXT NOT NULL REFERENCES needs(id),
  kind TEXT NOT NULL DEFAULT 'supply' CHECK (kind IN ('supply', 'info')),
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'needed' CHECK (status IN ('needed', 'covered')),
  created_at INTEGER NOT NULL
);
CREATE INDEX need_items_need ON need_items(need_id);

CREATE TABLE offer_skips (
  org_id TEXT NOT NULL,
  volunteer_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (org_id, volunteer_id, task_id)
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  spot_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  volunteer_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX reports_org ON reports(org_id, resolved_at);

CREATE TABLE partners (
  org_id TEXT NOT NULL REFERENCES orgs(id),
  partner_org_id TEXT NOT NULL REFERENCES orgs(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, partner_org_id)
);

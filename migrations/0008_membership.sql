-- Membership management (docs/decisions/0014-membership-management.md):
-- membership details on each person, the organization's own word for its
-- people, public applications, renewal reminders and email to a group.

-- What the organization calls its people: volunteers, members or participants.
ALTER TABLE orgs ADD COLUMN people_word TEXT NOT NULL DEFAULT 'volunteers';
-- The membership categories the organization uses, such as "Head coach".
ALTER TABLE orgs ADD COLUMN member_categories_json TEXT NOT NULL DEFAULT '[]';
-- Renewal reminders go out this many days before a membership expires. 0 turns them off.
ALTER TABLE orgs ADD COLUMN renewal_days INTEGER NOT NULL DEFAULT 30;
-- Where people renew, such as the organization's payment page.
ALTER TABLE orgs ADD COLUMN renewal_url TEXT;
-- Whether the public application page is open.
ALTER TABLE orgs ADD COLUMN join_open INTEGER NOT NULL DEFAULT 0;

ALTER TABLE volunteers ADD COLUMN member_category TEXT;
ALTER TABLE volunteers ADD COLUMN member_since INTEGER;
ALTER TABLE volunteers ADD COLUMN member_expires_at INTEGER;
-- When dues were last paid. Payments happen outside the tool.
ALTER TABLE volunteers ADD COLUMN dues_paid_at INTEGER;
-- The expiry date the last renewal reminder was for, so each goes out once.
ALTER TABLE volunteers ADD COLUMN renewal_reminded_for INTEGER;

-- People who applied on the public page, waiting for a coordinator.
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  category TEXT,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  volunteer_id TEXT,
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);
CREATE INDEX applications_org ON applications(org_id, status, created_at);

-- Email a coordinator wrote to a group. The text has no private links, so it is kept.
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipients INTEGER NOT NULL,
  sent INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX messages_org ON messages(org_id, created_at);

-- Two new kinds of email: renewal reminders and group messages.
CREATE TABLE emails_new (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('ask', 'confirm', 'reminder', 'unfilled', 'renewal', 'message')),
  to_email TEXT NOT NULL,
  volunteer_id TEXT,
  member_id TEXT,
  task_id TEXT,
  ask_id TEXT,
  spot_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'off', 'limit')),
  error TEXT,
  created_at INTEGER NOT NULL,
  message_id TEXT
);
INSERT INTO emails_new (id, org_id, kind, to_email, volunteer_id, member_id, task_id, ask_id, spot_id, status, error, created_at)
  SELECT id, org_id, kind, to_email, volunteer_id, member_id, task_id, ask_id, spot_id, status, error, created_at FROM emails;
DROP TABLE emails;
ALTER TABLE emails_new RENAME TO emails;
CREATE INDEX emails_org ON emails(org_id, created_at);

-- Email the tool sends: asks, confirmations, reminders and notes to
-- coordinators about tasks that aren't full. See
-- docs/decisions/0012-free-launch-and-email.md.

-- One row per email. Bodies are never stored: they hold private links.
CREATE TABLE emails (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('ask', 'confirm', 'reminder', 'unfilled')),
  to_email TEXT NOT NULL,
  volunteer_id TEXT,
  member_id TEXT,
  task_id TEXT,
  ask_id TEXT,
  spot_id TEXT,
  -- sent: the provider took it. failed: the provider refused it.
  -- off: email isn't set up, or the organization is a sample.
  -- limit: the organization reached its daily limit.
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'off', 'limit')),
  error TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX emails_org ON emails(org_id, created_at);

-- Extra private links for an ask, sent in confirmations and reminders, so the
-- person can cancel their spot. Stored only as hashes, like the ask's own link.
-- Making a new link for the ask removes these.
CREATE TABLE ask_links (
  token_hash TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  ask_id TEXT NOT NULL,
  volunteer_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX ask_links_ask ON ask_links(ask_id);

ALTER TABLE spots ADD COLUMN reminded_at INTEGER;
ALTER TABLE tasks ADD COLUMN unfilled_noted_at INTEGER;

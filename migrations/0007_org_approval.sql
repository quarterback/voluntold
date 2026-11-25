-- New organizations wait for approval before the tool sends any email for
-- them. Organizations that already exist count as approved.
ALTER TABLE orgs ADD COLUMN approved_at INTEGER;
-- Most emails the organization can send in 24 hours. An admin of the tool
-- can raise it for a large organization.
ALTER TABLE orgs ADD COLUMN email_daily_limit INTEGER NOT NULL DEFAULT 300;
UPDATE orgs SET approved_at = created_at;

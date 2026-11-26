-- Renewal reminders go out on their own ("auto"), or only when a
-- coordinator sends them from Reports ("manual").
ALTER TABLE orgs ADD COLUMN renewal_mode TEXT NOT NULL DEFAULT 'auto' CHECK (renewal_mode IN ('auto', 'manual'));

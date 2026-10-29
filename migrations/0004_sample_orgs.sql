-- Marks the sample organization the demo creates, so the app can show the tour
-- and give each person one sample instead of a new one every time.
ALTER TABLE orgs ADD COLUMN sample INTEGER NOT NULL DEFAULT 0;

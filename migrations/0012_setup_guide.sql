-- The setup guide a new organization sees: which steps it skipped and whether
-- it hid the guide. Steps finish on their own, from the organization's data.
ALTER TABLE orgs ADD COLUMN setup_json TEXT NOT NULL DEFAULT '{}';
-- An import that was undone keeps its row, so the history still shows it.
ALTER TABLE imports ADD COLUMN undone_at INTEGER;

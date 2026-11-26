-- What a new organization tells us when it signs up, for the admins who
-- approve it (docs/decisions/0013-approve-new-organizations.md).
ALTER TABLE orgs ADD COLUMN website TEXT;
-- "Under 50", "50 to 250", "250 to 1,000" or "Over 1,000".
ALTER TABLE orgs ADD COLUMN size_band TEXT;
-- What they use today: nothing, a spreadsheet, or a paid tool and its name.
ALTER TABLE orgs ADD COLUMN current_tool TEXT;
ALTER TABLE orgs ADD COLUMN intended_use TEXT;
-- When the person signing up confirmed everyone on the roster is 18 or older.
ALTER TABLE orgs ADD COLUMN adults_confirmed_at INTEGER;

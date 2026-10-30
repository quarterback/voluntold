-- Which sample organization this is (docs/specs/demo.md), so a person gets one
-- of each kind and the demo knows which story it's telling.
ALTER TABLE orgs ADD COLUMN sample_kind TEXT;

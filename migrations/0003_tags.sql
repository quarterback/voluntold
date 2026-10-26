-- Tags (next version spec, section 3). Each organization has its own tag set.
-- A tag keeps the color it was given when it was created. A tag the model
-- created shows a "new" mark until a coordinator has seen it (seen_at).

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK (created_by IN ('member', 'model', 'sample')),
  seen_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX tags_org ON tags(org_id);

-- Which tags sit on which record. object_type says which table object_id is in.
CREATE TABLE taggings (
  org_id TEXT NOT NULL,
  tag_id TEXT NOT NULL REFERENCES tags(id),
  object_type TEXT NOT NULL CHECK (object_type IN ('volunteer', 'task', 'need')),
  object_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (tag_id, object_type, object_id)
);
CREATE INDEX taggings_object ON taggings(org_id, object_type, object_id);

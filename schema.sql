-- D1 schema for Fall River plow-voting app

CREATE TABLE IF NOT EXISTS streets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  normalized_name TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_streets_normalized_name
  ON streets(normalized_name);

CREATE TABLE IF NOT EXISTS street_vote_totals (
  street_id INTEGER PRIMARY KEY,
  yes_count INTEGER NOT NULL DEFAULT 0,
  no_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(street_id) REFERENCES streets(id)
);

CREATE TABLE IF NOT EXISTS kol_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  name TEXT,
  hospital TEXT,
  specialty TEXT,
  result_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kol_name ON kol_analyses(name);
CREATE INDEX IF NOT EXISTS idx_kol_created ON kol_analyses(created_at);

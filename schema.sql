CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  salt TEXT NOT NULL,
  recovery_salt TEXT NOT NULL,
  wrapped_master_key TEXT NOT NULL,
  wrapped_master_key_iv TEXT NOT NULL,
  wrapped_master_key_recovery TEXT NOT NULL,
  wrapped_master_key_recovery_iv TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date_key TEXT NOT NULL UNIQUE,
  encrypted_content TEXT NOT NULL,
  iv TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_date_key ON notes(date_key);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

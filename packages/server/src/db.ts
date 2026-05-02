import Database from "better-sqlite3";

export function createDb(path = ":memory:"): Database.Database {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT DEFAULT '',
      author TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      install TEXT NOT NULL,
      homepage TEXT,
      repository TEXT,
      changelog TEXT,
      platforms TEXT DEFAULT '["any"]',
      category TEXT DEFAULT 'uncategorized',
      installs INTEGER DEFAULT 0,
      published_at TEXT DEFAULT (datetime('now')),
      UNIQUE(name, version)
    );
    CREATE TABLE IF NOT EXISTS authors (
      name TEXT PRIMARY KEY,
      feed_title TEXT,
      feed_description TEXT,
      icon TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

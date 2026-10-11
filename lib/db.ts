// Local SQLite database for accounts, reading progress and libraries.
// The file lives in ./data (git-ignored) and is created on first use.

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const g = globalThis as unknown as { __niDb?: Database.Database };

function open() {
  // Vercel functions can only write to /tmp, which resets between cold starts.
  const dir = process.env.VERCEL ? "/tmp/neonink" : path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "neonink.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      hue INTEGER NOT NULL DEFAULT 320,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    -- where the reader left off, one row per series
    CREATE TABLE IF NOT EXISTS progress (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      manga_id INTEGER NOT NULL,
      chapter_id TEXT NOT NULL,
      chapter_num TEXT,
      page INTEGER NOT NULL DEFAULT 0,
      pages INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      cover TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, manga_id)
    );
    -- every chapter opened, for "read" ticks and history
    CREATE TABLE IF NOT EXISTS reads (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      manga_id INTEGER NOT NULL,
      chapter_id TEXT NOT NULL,
      read_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, chapter_id)
    );
    CREATE TABLE IF NOT EXISTS library (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      manga_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('reading','plan','completed','favorite')),
      title TEXT NOT NULL,
      cover TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, manga_id)
    );
  `);
  return db;
}

export const db = () => (g.__niDb ??= open());

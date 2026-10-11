// SQLite database for accounts, reading progress and libraries.
// Uses Node's built-in node:sqlite (no native add-on to compile, so it deploys anywhere).
// The file lives in ./data (git-ignored) and is created on first use.

import { DatabaseSync, type StatementSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

type Param = null | number | bigint | string | Uint8Array;

/** The small slice of the better-sqlite3 statement API the app uses. */
class Stmt {
  constructor(private s: StatementSync, private plucked = false) {
    (s as { setAllowUnknownNamedParameters?: (v: boolean) => void }).setAllowUnknownNamedParameters?.(true);
  }
  pluck() {
    return new Stmt(this.s, true);
  }
  run(...args: any[]) {
    return this.s.run(...(args as Param[]));
  }
  get(...args: any[]): any {
    const row = this.s.get(...(args as Param[])) as Record<string, unknown> | undefined;
    return this.plucked && row ? Object.values(row)[0] : row;
  }
  all(...args: any[]): any[] {
    const rows = this.s.all(...(args as Param[])) as Record<string, unknown>[];
    return this.plucked ? rows.map((r) => Object.values(r)[0]) : rows;
  }
}

class Db {
  constructor(private raw: DatabaseSync) {}
  prepare(sql: string) {
    return new Stmt(this.raw.prepare(sql));
  }
  exec(sql: string) {
    this.raw.exec(sql);
  }
  transaction<A extends unknown[], R>(fn: (...a: A) => R) {
    return (...a: A): R => {
      this.raw.exec("BEGIN");
      try {
        const r = fn(...a);
        this.raw.exec("COMMIT");
        return r;
      } catch (e) {
        this.raw.exec("ROLLBACK");
        throw e;
      }
    };
  }
}

const g = globalThis as unknown as { __niDb?: Db };

function open() {
  // Vercel functions can only write to /tmp, which resets between cold starts.
  const dir = process.env.VERCEL ? "/tmp/neonink" : path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Db(new DatabaseSync(path.join(dir, "neonink.db")));
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
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

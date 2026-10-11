// Database for accounts, reading progress and libraries.
// On Vercel this is Turso (hosted SQLite, set up through the Vercel Marketplace,
// which provides TURSO_DATABASE_URL and TURSO_AUTH_TOKEN). Without those it falls
// back to a local SQLite file in ./data (git-ignored), created on first use.

import { createClient, type Client, type InStatement, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
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
  `;

const g = globalThis as unknown as { __niDb?: Promise<Client> };

async function open() {
  const remote = process.env.TURSO_DATABASE_URL;
  let client: Client;
  if (remote) {
    client = createClient({ url: remote, authToken: process.env.TURSO_AUTH_TOKEN });
  } else {
    // Vercel functions can only write to /tmp, which resets between cold starts.
    const dir = process.env.VERCEL ? "/tmp/neonink" : path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    client = createClient({ url: `file:${path.join(dir, "neonink.db")}` });
    await client.execute("PRAGMA foreign_keys = ON");
  }
  await client.executeMultiple(SCHEMA);
  return client;
}

function client() {
  return (g.__niDb ??= open().catch((err) => {
    g.__niDb = undefined;
    throw err;
  }));
}

type Args = InValue[] | Record<string, InValue>;
const toArgs = (a: unknown[]): Args =>
  a.length === 1 && a[0] !== null && typeof a[0] === "object" && !(a[0] instanceof Uint8Array) ? (a[0] as Record<string, InValue>) : (a as InValue[]);

/** A small, async take on the better-sqlite3 statement API the app was written against. */
class Stmt {
  constructor(private sql: string, private plucked = false) {}
  pluck() {
    return new Stmt(this.sql, true);
  }
  /** The statement with its arguments, for db().batch(). */
  bind(...args: unknown[]): InStatement {
    return { sql: this.sql, args: toArgs(args) };
  }
  async run(...args: unknown[]) {
    const rs = await (await client()).execute(this.bind(...args));
    return { changes: rs.rowsAffected, lastInsertRowid: rs.lastInsertRowid ?? 0n };
  }
  async get(...args: unknown[]): Promise<any> {
    return (await this.all(...args))[0];
  }
  async all(...args: unknown[]): Promise<any[]> {
    const rs = await (await client()).execute(this.bind(...args));
    const rows = rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])));
    return this.plucked ? rows.map((r) => Object.values(r)[0]) : rows;
  }
}

export const db = () => ({
  prepare: (sql: string) => new Stmt(sql),
  /** Runs statements in one transaction. */
  batch: async (stmts: InStatement[]) => {
    if (stmts.length) await (await client()).batch(stmts, "write");
  },
});

// Offline index of the MangaDex catalog, built by scripts/build-catalog.mjs.
// Maps AniList (and, for titles MangaDex hasn't linked to AniList, MyAnimeList) ids
// to MangaDex ids, and records which titles have English chapters.
// Rebuild it now and then: `node scripts/build-catalog.mjs`.

import "server-only";
import fs from "node:fs";
import path from "node:path";

type Row = [mdId: string, english?: 1];
interface Index {
  generatedAt: string | null;
  titles: number;
  english: number;
  al: Record<string, Row>;
  mal: Record<string, Row>;
}

// Read from disk once per server instance (next.config.ts ships the file with every route).
// A missing index just means every lookup falls back to MangaDex title search.
const EMPTY: Index = { generatedAt: null, titles: 0, english: 0, al: {}, mal: {} };
let index: Index | null = null;
let warned = false;
function load(): Index {
  if (index) return index;
  try {
    return (index = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/data/catalog.json"), "utf8")) as Index);
  } catch (err) {
    // not remembered, so a freshly built index is picked up without a restart
    if (!warned) console.warn("[catalog] no index, using title search only:", (err as Error).message);
    warned = true;
    return EMPTY;
  }
}

export interface CatalogHit {
  mdId: string;
  english: boolean;
}

export function lookup(anilistId: number, malId?: number | null): CatalogHit | null {
  const { al, mal } = load();
  const row = al[anilistId] ?? (malId ? mal[malId] : undefined);
  return row ? { mdId: row[0], english: row[1] === 1 } : null;
}

export function catalogStats() {
  const { generatedAt, titles, english } = load();
  return { generatedAt, titles, english };
}

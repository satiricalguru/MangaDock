// Crawls the whole MangaDex catalog (every safe/suggestive title that has readable chapters)
// and writes lib/data/catalog.json: the AniList and MyAnimeList ids MangaDex links to,
// plus which titles have English chapters.
//
// The site uses it to match an AniList title to its MangaDex chapters exactly and instantly,
// instead of guessing with up to four title searches per page view.
//
//   node scripts/build-catalog.mjs
//
// Takes a few minutes. Stays under MangaDex's limit of 5 requests a second.

import fs from "node:fs";
import path from "node:path";

const API = "https://api.mangadex.org";
const UA = "MangaDock/0.2 (free fan site; non-commercial; catalog index)";
const OUT = path.join(import.meta.dirname, "..", "lib", "data", "catalog.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
      if (res.ok) return res.json();
      if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${await res.text()}`);
    } catch (err) {
      if (i === 5) throw err;
    }
    await sleep(1000 * 2 ** i);
  }
}

// MangaDex caps offset + limit at 10,000, so walk forward by creation date instead.
// Titles created in the same second are paged with an offset inside that second.
const seen = new Map();
let since = "2000-01-01T00:00:00";
let offset = 0;
for (let req = 0; ; req++) {
  const q = new URLSearchParams({ limit: "100", offset: String(offset), "order[createdAt]": "asc", createdAtSince: since, hasAvailableChapters: "true" });
  ["safe", "suggestive"].forEach((r) => q.append("contentRating[]", r));
  const page = await get(`${API}/manga?${q}`);
  let added = 0;
  for (const m of page.data) {
    if (seen.has(m.id)) continue;
    added++;
    const a = m.attributes;
    seen.set(m.id, {
      al: Number(a.links?.al) || 0,
      mal: Number(a.links?.mal) || 0,
      en: a.availableTranslatedLanguages.includes("en"),
      createdAt: a.createdAt.slice(0, 19),
    });
  }
  if (page.data.length < 100) break;
  const last = page.data[page.data.length - 1].attributes.createdAt.slice(0, 19);
  if (last === since) offset += 100;
  else {
    since = last;
    // titles from this second that we already have come back first next time; skip past them
    offset = page.data.filter((m) => m.attributes.createdAt.slice(0, 19) === last).length;
  }
  if (req % 20 === 0) console.log(`${seen.size} titles · up to ${since} · +${added}`);
  await sleep(250);
}

// AniList id -> [MangaDex id, has English]. If two MangaDex entries claim one AniList id,
// prefer the one with English chapters.
const al = {};
const mal = {};
let english = 0;
for (const [id, v] of seen) {
  if (v.en) english++;
  const row = v.en ? [id, 1] : [id];
  if (v.al && (!al[v.al] || (v.en && !al[v.al][1]))) al[v.al] = row;
  else if (!v.al && v.mal && (!mal[v.mal] || (v.en && !mal[v.mal][1]))) mal[v.mal] = row;
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), titles: seen.size, english, al, mal }));
const orphans = [...seen.values()].filter((v) => v.en && !v.al && !v.mal).length;
console.log(`English titles with no AniList/MAL link: ${orphans}`);
console.log(`done: ${seen.size} titles (${english} in English), ${Object.keys(al).length} linked to AniList, ${Object.keys(mal).length} more via MyAnimeList`);
console.log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)`);

# MangaDock

A free, ad-free anime-style site for discovering and reading manga, manhwa and manhua.

- **Homepage:** a WebGL scroll scene (React Three Fiber). Your Gemini video plays through a custom shader with liquid flow, a pointer ripple, a hue shift as you scroll, manga halftone and a chromatic split on fast scrolls. The camera flies through a tunnel of floating covers from this week's trending titles. Phones without WebGL get the plain video, and visitors with reduced motion get a still image.
- **Homepage on phones:** no WebGL (it crashed iOS WebKit), but the poster drifts slowly, two rows of trending covers float behind the headline, and sections fade in as you scroll. All of it is CSS transforms and one-shot transitions, so no animated layers pile up.
- **Browse** (`/browse`): search, plus filters for type (manga / manhwa / manhua), sort, status and genre. Two sources:
  - **Everything:** the full AniList catalog. Cards marked **Read** have English chapters here.
  - **Readable now** (`?src=md`): straight from MangaDex, so every result opens in the reader, including about 16,000 English series AniList doesn't list.
- **MangaDex-only titles** (`/title/[mangadexId]`): info, chapters, library and reading progress for series that aren't on AniList.
- **Title pages** (`/manga/[anilistId]`): AniList info, the MyAnimeList score (via Jikan), official reading links, and chapters from MangaDex.
- **Reader** (`/read/[chapterId]`): vertical strip reader with a progress bar, width slider, data-saver mode, ← → keys to change chapters, and scanlation-group credits on every chapter.
- **Credits** (`/credits`): every data source, legal reading platform and design reference.

## Run it

Needs Node 20.9 or newer.

```bash
npm install
npm run dev      # http://localhost:3000
```

Production: `npm run build && npm start`, or deploy the folder to Vercel.

## Rules we follow (MangaDex + AniList terms)

- No ads, no paid features, ever (MangaDex requirement).
- Credit MangaDex and the scanlation group on every chapter, and honour takedown requests.
- AniList is free for non-commercial use. All API calls are cached server-side (AniList 1h, Jikan 24h, MangaDex 15 min).
- Webtoons and Anime-Planet have no public API, so we link to them instead of copying them.

## Where things live

| Path | What |
|---|---|
| `components/hero/` | WebGL scene, shaders and fallbacks |
| `lib/anilist.ts`, `lib/jikan.ts`, `lib/mangadex.ts` | API clients |
| `app/api/img` | Same-origin image proxy so WebGL can use covers as textures |
| `public/media/` | Gemini hero video (seamless 8.5s loop, MP4 + WebM) and poster |
| `app/globals.css` | MangaDock colour tokens and utilities |
| `scripts/build-catalog.mjs` | Crawls all of MangaDex and writes `lib/data/catalog.json` |
| `lib/catalog.ts` | Reads that index: AniList/MAL id → MangaDex id, and whether English chapters exist |

## Catalog index

`lib/data/catalog.json` maps every MangaDex title to its AniList (or MyAnimeList) id, so a title page finds its chapters with one exact lookup instead of guessing by name. The last build covered 55,093 MangaDex titles: 49,248 have English chapters, 33,160 link to AniList and 2,340 more link only to MyAnimeList.

Rebuild it every few weeks to pick up new series (about 10 minutes, under MangaDex's rate limit):

```bash
node scripts/build-catalog.mjs
```

Titles added since the last build still work: they fall back to a live MangaDex title search.

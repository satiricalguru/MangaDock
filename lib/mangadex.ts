// MangaDex API. Their usage policy for third-party sites:
//  - credit MangaDex and the scanlation group on every chapter
//  - no ads or paid features, ever
//  - honor takedown requests from scanlation groups
// All calls run server-side so the browser never talks to the API directly.

import { cached, fetchRetry } from "./cache";
import { lookup } from "./catalog";
import type { Media } from "./anilist";

const API = "https://api.mangadex.org";
const UA = "MangaDock/0.2 (free fan site; non-commercial)";
const RATINGS = ["safe", "suggestive"];

async function md<T>(path: string, ttlMs = 10 * 60_000): Promise<T> {
  return cached(`md:${path}`, ttlMs, async () => {
    const res = await fetchRetry(`${API}${path}`, { headers: { "User-Agent": UA } }, 2, 12000).catch((err) => {
      console.warn("[mangadex]", path.slice(0, 120), (err as Error).message);
      throw err;
    });
    if (!res.ok) {
      console.warn("[mangadex]", res.status, path.slice(0, 120));
      throw new Error(`MangaDex ${res.status} on ${path}`);
    }
    return res.json() as Promise<T>;
  });
}

interface Relationship {
  id: string;
  type: string;
  attributes?: { name?: string; fileName?: string; website?: string | null };
}

interface MdMangaRaw {
  id: string;
  attributes: {
    title: Record<string, string>;
    altTitles: Record<string, string>[];
    links: Record<string, string> | null;
    availableTranslatedLanguages: (string | null)[];
  };
}

export interface MdManga {
  id: string;
  title: string;
  languages: string[];
}

export interface MdChapter {
  id: string;
  chapter: string | null;
  volume: string | null;
  title: string | null;
  pages: number;
  publishAt: string;
  externalUrl: string | null;
  groups: { id: string; name: string; website: string | null }[];
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "");

function toManga(m: MdMangaRaw): MdManga {
  return {
    id: m.id,
    title: m.attributes.title.en ?? Object.values(m.attributes.title)[0],
    languages: m.attributes.availableTranslatedLanguages.filter(Boolean) as string[],
  };
}

/**
 * Find the MangaDex entry for an AniList title.
 * 1. The offline catalog index (lib/catalog.ts) knows the AniList and MAL ids MangaDex links to.
 * 2. Otherwise search by title: MangaDex stores the AniList id in links.al, which is an exact match.
 * 3. Failing that, accept a title that matches one of ours exactly (ignoring case and punctuation).
 */
export async function findMangaDex(anilistId: number, titles: string[], malId?: number | null): Promise<MdManga | null> {
  const hit = lookup(anilistId, malId);
  if (hit) {
    try {
      const { data } = await md<{ data: MdMangaRaw }>(`/manga/${hit.mdId}`, 60 * 60_000);
      return toManga(data);
    } catch {
      // removed from MangaDex since the index was built; fall back to searching
    }
  }
  const wanted = new Set(titles.filter(Boolean).map(norm));
  let fallback: MdMangaRaw | null = null;
  for (const t of titles.filter(Boolean).slice(0, 4)) {
    try {
      const q = new URLSearchParams({ title: t, limit: "15" });
      RATINGS.forEach((r) => q.append("contentRating[]", r));
      const data = await md<{ data: MdMangaRaw[] }>(`/manga?${q}`, 24 * 3600_000);
      const exact = data.data.find((m) => m.attributes.links?.al === String(anilistId));
      if (exact) return toManga(exact);
      fallback ??=
        data.data.find((m) =>
          [...Object.values(m.attributes.title), ...m.attributes.altTitles.flatMap((a) => Object.values(a))].some((x) => wanted.has(norm(x))),
        ) ?? null;
    } catch {
      // try the next title variant
    }
  }
  return fallback ? toManga(fallback) : null;
}

/** Chapters in one language, oldest first, one per chapter number (first group wins). */
export async function getChapters(mangaId: string, lang = "en"): Promise<MdChapter[]> {
  const all: MdChapter[] = [];
  for (let offset = 0; offset < 3000; offset += 500) {
    const q = new URLSearchParams({
      limit: "500",
      offset: String(offset),
      "order[chapter]": "asc",
      "translatedLanguage[]": lang,
      "includes[]": "scanlation_group",
    });
    RATINGS.forEach((r) => q.append("contentRating[]", r));
    const data = await md<{ data: { id: string; attributes: Record<string, any>; relationships: Relationship[] }[]; total: number }>(
      `/manga/${mangaId}/feed?${q}`,
    );
    for (const c of data.data) {
      all.push({
        id: c.id,
        chapter: c.attributes.chapter,
        volume: c.attributes.volume,
        title: c.attributes.title,
        pages: c.attributes.pages,
        publishAt: c.attributes.publishAt,
        externalUrl: c.attributes.externalUrl,
        groups: c.relationships
          .filter((r) => r.type === "scanlation_group")
          .map((r) => ({ id: r.id, name: r.attributes?.name ?? "Unknown group", website: r.attributes?.website ?? null })),
      });
    }
    if (offset + 500 >= data.total) break;
  }
  const seen = new Set<string>();
  return all.filter((c) => {
    if (c.externalUrl || c.pages === 0) return false;
    const key = c.chapter ?? c.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getChapter(chapterId: string) {
  const data = await md<{ data: { id: string; attributes: Record<string, any>; relationships: Relationship[] } }>(
    `/chapter/${chapterId}?includes[]=scanlation_group&includes[]=manga`,
    60 * 60_000,
  );
  const c = data.data;
  const manga = c.relationships.find((r) => r.type === "manga");
  return {
    id: c.id,
    chapter: c.attributes.chapter as string | null,
    title: c.attributes.title as string | null,
    language: c.attributes.translatedLanguage as string,
    externalUrl: c.attributes.externalUrl as string | null,
    mangaId: manga?.id ?? null,
    groups: c.relationships
      .filter((r) => r.type === "scanlation_group")
      .map((r) => ({ id: r.id, name: r.attributes?.name ?? "Unknown group", website: r.attributes?.website ?? null })),
  };
}

/** Page image URLs from the MangaDex@Home network. Cached briefly: the base URL expires after ~15 min. */
export async function getPages(chapterId: string, dataSaver = false) {
  const { baseUrl, chapter } = await md<{ baseUrl: string; chapter: { hash: string; data: string[]; dataSaver: string[] } }>(
    `/at-home/server/${chapterId}`,
    5 * 60_000,
  );
  const quality = dataSaver ? "data-saver" : "data";
  const files = dataSaver ? chapter.dataSaver : chapter.data;
  return files.map((f) => `${baseUrl}/${quality}/${chapter.hash}/${f}`);
}

export const LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", "es-la": "Spanish (LatAm)", "pt-br": "Portuguese (BR)", fr: "French", id: "Indonesian",
  ru: "Russian", vi: "Vietnamese", it: "Italian", de: "German", tr: "Turkish", pl: "Polish", th: "Thai", ar: "Arabic",
  ja: "Japanese", ko: "Korean", zh: "Chinese", "zh-hk": "Chinese (HK)", uk: "Ukrainian", hi: "Hindi",
};

// --- Browsing MangaDex directly ---------------------------------------------
// Used by /browse?src=md ("Readable now"): every result has chapters you can read here,
// including the thousands of titles AniList doesn't list.

interface MdTitleRaw {
  id: string;
  attributes: {
    title: Record<string, string>;
    altTitles: Record<string, string>[];
    description: Record<string, string>;
    links: Record<string, string> | null;
    originalLanguage: string;
    status: string | null;
    year: number | null;
    lastChapter: string | null;
    contentRating: string;
    tags: { id: string; attributes: { name: Record<string, string>; group: string } }[];
    availableTranslatedLanguages: (string | null)[];
  };
  relationships: (Relationship & { attributes?: { fileName?: string; name?: string } })[];
}

export interface MdTitle {
  id: string;
  anilistId: number | null;
  title: string;
  altTitles: string[];
  description: string;
  cover: string | null;
  country: "JP" | "KR" | "CN" | null;
  status: string | null;
  year: number | null;
  lastChapter: string | null;
  genres: string[];
  themes: string[];
  authors: string[];
  languages: string[];
}

const COUNTRY: Record<string, MdTitle["country"]> = { ja: "JP", ko: "KR", zh: "CN", "zh-hk": "CN" };
const LANG_OF: Record<string, string[]> = { JP: ["ja"], KR: ["ko"], CN: ["zh", "zh-hk"] };

/** Cover art goes through our image proxy: MangaDex doesn't allow hotlinking. */
export const mdCover = (mangaId: string, fileName: string, size: 256 | 512 = 512) =>
  `/api/img?u=${encodeURIComponent(`https://uploads.mangadex.org/covers/${mangaId}/${fileName}.${size}.jpg`)}`;

function pickTitle(a: MdTitleRaw["attributes"]) {
  const alt = (lang: string) => a.altTitles.find((t) => t[lang])?.[lang];
  return a.title.en ?? alt("en") ?? Object.values(a.title)[0] ?? alt("ja-ro") ?? "Untitled";
}

function toTitle(m: MdTitleRaw, coverSize: 256 | 512 = 512): MdTitle {
  const a = m.attributes;
  const cover = m.relationships.find((r) => r.type === "cover_art")?.attributes?.fileName;
  const tagNames = (group: string) => a.tags.filter((t) => t.attributes.group === group).map((t) => t.attributes.name.en).filter(Boolean);
  return {
    id: m.id,
    anilistId: Number(a.links?.al) || null,
    title: pickTitle(a),
    altTitles: a.altTitles.flatMap((t) => Object.values(t)).slice(0, 8),
    description: a.description?.en ?? Object.values(a.description ?? {})[0] ?? "",
    cover: cover ? mdCover(m.id, cover, coverSize) : null,
    country: COUNTRY[a.originalLanguage] ?? null,
    status: a.status,
    year: a.year,
    lastChapter: a.lastChapter || null,
    genres: tagNames("genre"),
    themes: tagNames("theme"),
    authors: [...new Set(m.relationships.filter((r) => r.type === "author" || r.type === "artist").map((r) => r.attributes?.name).filter(Boolean) as string[])],
    languages: a.availableTranslatedLanguages.filter(Boolean) as string[],
  };
}

/** Tag name -> id, so AniList genre names can filter MangaDex results. */
async function tagIds() {
  const data = await md<{ data: { id: string; attributes: { name: { en: string } } }[] }>("/manga/tag", 24 * 3600_000);
  const map = new Map(data.data.map((t) => [t.attributes.name.en.toLowerCase(), t.id]));
  map.set("mahou shoujo", map.get("magical girls")!);
  return map;
}

export const MD_SORTS = {
  TRENDING_DESC: "followedCount",
  POPULARITY_DESC: "followedCount",
  SCORE_DESC: "rating",
  START_DATE_DESC: "year",
  UPDATED_AT_DESC: "latestUploadedChapter",
  FAVOURITES_DESC: "followedCount",
} as const;

export interface MdListOptions {
  search?: string;
  genre?: string;
  country?: "JP" | "KR" | "CN";
  status?: "RELEASING" | "FINISHED";
  sort?: keyof typeof MD_SORTS;
  page?: number;
  perPage?: number;
  lang?: string;
}

/** A page of MangaDex titles with chapters in `lang` (English by default). */
export async function listMangaDex(opts: MdListOptions = {}) {
  const { search, genre, country, status, sort = "TRENDING_DESC", page = 1, perPage = 30, lang = "en" } = opts;
  // MangaDex refuses offset + limit beyond 10,000
  const offset = Math.min((page - 1) * perPage, 10_000 - perPage);
  const q = new URLSearchParams({ limit: String(perPage), offset: String(offset), hasAvailableChapters: "true" });
  q.append("availableTranslatedLanguage[]", lang);
  q.append("includes[]", "cover_art");
  RATINGS.forEach((r) => q.append("contentRating[]", r));
  if (search) q.set("title", search);
  else q.set(`order[${MD_SORTS[sort] ?? "followedCount"}]`, "desc");
  if (country) LANG_OF[country].forEach((l) => q.append("originalLanguage[]", l));
  if (status) q.append("status[]", status === "RELEASING" ? "ongoing" : "completed");
  let unknownGenre = false;
  if (genre) {
    const id = (await tagIds().catch(() => new Map<string, string>())).get(genre.toLowerCase());
    if (id) q.append("includedTags[]", id);
    else unknownGenre = true;
  }
  const data = await md<{ data: MdTitleRaw[]; total: number }>(`/manga?${q}`, search ? 10 * 60_000 : 30 * 60_000);
  return {
    titles: data.data.map((m) => toTitle(m, 256)),
    total: data.total,
    hasNextPage: offset + perPage < Math.min(data.total, 10_000),
    unknownGenre,
  };
}

export async function getMdTitle(id: string) {
  const { data } = await md<{ data: MdTitleRaw }>(`/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`, 60 * 60_000);
  if (!RATINGS.includes(data.attributes.contentRating)) return null;
  return toTitle(data);
}

/**
 * Progress and library rows are keyed by a number (the AniList id). Titles that only
 * exist on MangaDex get a negative number derived from their id instead, which can't
 * collide with an AniList id.
 */
export const mdKey = (uuid: string) => -parseInt(uuid.replace(/-/g, "").slice(0, 13), 16);

/** A MangaDex title in the shape MangaCard expects. */
export function mdAsMedia(t: MdTitle): Media {
  return {
    id: t.anilistId ?? mdKey(t.id),
    idMal: null,
    title: { romaji: t.title, english: null, native: null },
    coverImage: { extraLarge: t.cover ?? "", large: t.cover ?? "", color: null },
    genres: t.genres,
    averageScore: null,
    popularity: 0,
    chapters: null,
    status: t.status,
    format: null,
    countryOfOrigin: t.country,
    startDate: { year: t.year },
    readable: true,
    href: t.anilistId ? `/manga/${t.anilistId}` : `/title/${t.id}`,
  };
}

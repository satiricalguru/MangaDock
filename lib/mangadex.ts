// MangaDex API. Their usage policy for third-party sites:
//  - credit MangaDex and the scanlation group on every chapter
//  - no ads or paid features, ever
//  - honor takedown requests from scanlation groups
// All calls run server-side so the browser never talks to the API directly.

import { cached, fetchRetry } from "./cache";

const API = "https://api.mangadex.org";
const UA = "NeonInk/0.2 (free fan site; non-commercial)";
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
 * 1. MangaDex stores the AniList id in links.al, which is an exact match.
 * 2. Otherwise accept a title that matches one of ours exactly (ignoring case and punctuation).
 */
export async function findMangaDex(anilistId: number, titles: string[]): Promise<MdManga | null> {
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

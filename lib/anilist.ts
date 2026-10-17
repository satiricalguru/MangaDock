// AniList GraphQL client. Free for non-commercial use, no key needed.
// Every call goes through the shared cache, so we stay well under AniList's rate limit
// and keep serving the last good data if AniList is briefly down.

import { cached, fetchRetry } from "./cache";
import { lookup } from "./catalog";

const ENDPOINT = "https://graphql.anilist.co";

export interface Media {
  id: number;
  idMal: number | null;
  isAdult?: boolean;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { extraLarge: string; large: string; color: string | null };
  bannerImage?: string | null;
  description?: string | null;
  genres: string[];
  averageScore: number | null;
  popularity: number;
  chapters: number | null;
  volumes?: number | null;
  status: string | null;
  format: string | null;
  countryOfOrigin: string | null;
  startDate: { year: number | null };
  trending?: number;
  /** has English chapters on MangaDex, per the catalog index */
  readable?: boolean;
  /** overrides the /manga/[id] link (MangaDex-only titles) */
  href?: string;
}

export interface MediaDetail extends Media {
  synonyms: string[];
  tags: { name: string; rank: number; isMediaSpoiler: boolean }[];
  staff: { edges: { role: string; node: { name: { full: string } } }[] };
  characters: { edges: { role: string; node: { name: { full: string }; image: { medium: string } } }[] };
  externalLinks: { site: string; url: string; type: string; icon: string | null; color: string | null }[];
  recommendations: { nodes: { mediaRecommendation: Media | null }[] };
}

// Lighter field set for shelves and grids (no long descriptions), which keeps AniList responses fast.
const CARD_FIELDS = `
  id idMal isAdult
  title { romaji english native }
  coverImage { extraLarge large color }
  genres averageScore popularity chapters status format countryOfOrigin
  startDate { year }
`;

const MEDIA_FIELDS = `
  id idMal isAdult
  title { romaji english native }
  coverImage { extraLarge large color }
  bannerImage description(asHtml: false) genres averageScore popularity
  chapters volumes status format countryOfOrigin trending
  startDate { year }
`;

async function query<T>(q: string, variables: Record<string, unknown> = {}, ttlMs = 30 * 60_000): Promise<T> {
  const key = `al:${q.replace(/\s+/g, " ")}:${JSON.stringify(variables)}`;
  return cached(key, ttlMs, async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      // AniList's empty-list glitch tends to come in bursts, so back off between tries.
      if (attempt > 0) await new Promise((r) => setTimeout(r, 700 * attempt));
      try {
        const res = await fetchRetry(
          ENDPOINT,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ query: q, variables }),
          },
          2,
          12000,
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.errors) throw new Error(json.errors?.[0]?.message ?? `AniList ${res.status}`);
        // AniList sometimes answers 200 with an empty list for queries that have results.
        // Treat that as a failure so it is retried and never cached (searches can be legitimately empty).
        if (!variables.search && hasEmptyPage(json.data)) throw new Error("AniList returned an empty list");
        return json.data as T;
      } catch (err) {
        lastErr = err;
        if (/not found/i.test((err as Error).message)) break;
      }
    }
    console.error("[anilist]", (lastErr as Error)?.message, JSON.stringify(variables).slice(0, 200));
    throw lastErr;
  });
}

function hasEmptyPage(data: unknown) {
  if (!data || typeof data !== "object") return false;
  return Object.values(data as Record<string, unknown>).some(
    (v) => v && typeof v === "object" && Array.isArray((v as { media?: unknown[] }).media) && (v as { media: unknown[] }).media.length === 0,
  );
}

export interface ListOptions {
  sort?: "TRENDING_DESC" | "POPULARITY_DESC" | "SCORE_DESC" | "START_DATE_DESC" | "UPDATED_AT_DESC" | "FAVOURITES_DESC";
  genre?: string;
  country?: "JP" | "KR" | "CN";
  search?: string;
  page?: number;
  perPage?: number;
  status?: "RELEASING" | "FINISHED";
  /** include description and banner (only needed for the homepage spotlight) */
  full?: boolean;
}

// AniList's isAdult:false filter currently returns empty first pages for many queries,
// so adult titles are excluded by genre in the query and by flag afterwards.
const NOT_ADULT = `genre_not_in:["Hentai"]`;
const safe = (list: Media[]) => list.filter((m) => !m.isAdult).map(withReadable);
const withReadable = <T extends Media>(m: T): T => ({ ...m, readable: lookup(m.id, m.idMal)?.english ?? false });

const LIST_ARGS = `type:MANGA, ${NOT_ADULT}, sort:$sort, genre:$genre, countryOfOrigin:$country, search:$search, status:$status`;

export async function listManga(opts: ListOptions = {}) {
  const { sort = "TRENDING_DESC", genre, country, search, page = 1, perPage = 20, status } = opts;
  const data = await query<{ Page: { pageInfo: { hasNextPage: boolean; total: number }; media: Media[] } }>(
    `query ($page:Int,$perPage:Int,$sort:[MediaSort],$genre:String,$country:CountryCode,$search:String,$status:MediaStatus){
      Page(page:$page, perPage:$perPage){
        pageInfo{ hasNextPage total }
        media(${LIST_ARGS}){ ${CARD_FIELDS} }
      }
    }`,
    { page, perPage, sort: search ? ["SEARCH_MATCH"] : [sort], genre, country, search, status },
    search ? 10 * 60_000 : 30 * 60_000,
  );
  return { ...data.Page, media: safe(data.Page.media) };
}

/** Several lists in one request (GraphQL aliases), so the homepage costs 2 API calls, not 9. */
export async function listMany<K extends string>(lists: Record<K, ListOptions>): Promise<Record<K, Media[]>> {
  const keys = Object.keys(lists) as K[];
  const vars: Record<string, unknown> = {};
  const defs: string[] = [];
  const parts = keys.map((k, i) => {
    const o = lists[k];
    const args = [`type:MANGA`, NOT_ADULT, `sort:[${o.sort ?? "TRENDING_DESC"}]`];
    if (o.genre) {
      vars[`g${i}`] = o.genre;
      defs.push(`$g${i}:String`);
      args.push(`genre:$g${i}`);
    }
    if (o.country) args.push(`countryOfOrigin:${o.country}`);
    if (o.status) args.push(`status:${o.status}`);
    return `${k}: Page(page:${o.page ?? 1}, perPage:${o.perPage ?? 16}){ media(${args.join(", ")}){ ${o.full ? MEDIA_FIELDS : CARD_FIELDS} } }`;
  });
  const q = `query ${defs.length ? `(${defs.join(",")})` : ""} { ${parts.join("\n")} }`;
  const data = await query<Record<K, { media: Media[] }>>(q, vars);
  return Object.fromEntries(keys.map((k) => [k, safe(data[k]?.media ?? [])])) as Record<K, Media[]>;
}

export async function getManga(id: number) {
  const data = await query<{ Media: MediaDetail }>(
    `query ($id:Int){
      Media(id:$id, type:MANGA){
        ${MEDIA_FIELDS}
        synonyms
        tags{ name rank isMediaSpoiler }
        staff(perPage:4, sort:RELEVANCE){ edges{ role node{ name{ full } } } }
        characters(perPage:8, sort:[ROLE, RELEVANCE]){ edges{ role node{ name{ full } image{ medium } } } }
        externalLinks{ site url type icon color }
        recommendations(perPage:12, sort:RATING_DESC){ nodes{ mediaRecommendation{ ${CARD_FIELDS} } } }
      }
    }`,
    { id },
  );
  const m = data.Media;
  return {
    ...withReadable(m),
    recommendations: { nodes: m.recommendations.nodes.filter((n) => n.mediaRecommendation && !n.mediaRecommendation.isAdult).map((n) => ({ mediaRecommendation: withReadable(n.mediaRecommendation!) })) },
  };
}

export async function getGenres() {
  const data = await query<{ GenreCollection: string[] }>(`{ GenreCollection }`, {}, 24 * 3600_000);
  return data.GenreCollection.filter((g) => g !== "Hentai");
}

/** A random popular title, for the "Surprise me" button. */
export async function randomManga() {
  // AniList occasionally returns an empty page, so try a few different ones
  for (let attempt = 0; attempt < 3; attempt++) {
    const page = 1 + Math.floor(Math.random() * 40);
    const list = await listManga({ sort: "POPULARITY_DESC", page, perPage: 25 }).then((d) => d.media, () => []);
    if (list.length) return list[Math.floor(Math.random() * list.length)];
  }
  return null;
}

export function displayTitle(m: Pick<Media, "title">) {
  return m.title.english || m.title.romaji;
}

export function plainText(html: string | null | undefined, max = 0) {
  const text = (html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\(Source:[^)]*\)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return max && text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

export const COUNTRY_LABEL: Record<string, string> = { JP: "Manga", KR: "Manhwa", CN: "Manhua", TW: "Manhua" };

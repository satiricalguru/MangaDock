// Jikan: unofficial MyAnimeList API. Used for the MAL score on title pages.
// It is optional: short timeout, and a failure is remembered for a while so an
// unreachable Jikan never slows pages down.

import { cached, fetchRetry } from "./cache";

export interface MalStats {
  score: number | null;
  rank: number | null;
  members: number | null;
  url: string;
}

const g = globalThis as unknown as { __niJikanDownUntil?: number };

export async function getMalStats(idMal: number | null): Promise<MalStats | null> {
  if (!idMal || (g.__niJikanDownUntil ?? 0) > Date.now()) return null;
  try {
    return await cached(`jikan:${idMal}`, 24 * 3600_000, async () => {
      const res = await fetchRetry(`https://api.jikan.moe/v4/manga/${idMal}`, {}, 1, 2500);
      if (!res.ok) throw new Error(`Jikan ${res.status}`);
      const { data } = await res.json();
      return { score: data.score, rank: data.rank, members: data.members, url: data.url } as MalStats;
    });
  } catch (err) {
    console.error("[jikan] unavailable, skipping MAL scores for 30 min:", (err as Error).message);
    g.__niJikanDownUntil = Date.now() + 30 * 60_000;
    return null;
  }
}

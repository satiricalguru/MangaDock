// Lines the first card of a horizontal rail up with headings in the 7xl container, at every width.
export const RAIL_PAD = {
  paddingInline: "max(1.5rem, calc((100vw - 80rem) / 2 + 1.5rem))",
  scrollPaddingInline: "max(1.5rem, calc((100vw - 80rem) / 2 + 1.5rem))",
};

/**
 * Link to a series page from a saved library/progress row. AniList titles have positive ids;
 * MangaDex-only titles have a negative key, and their MangaDex id is recovered from the cover URL.
 */
export function seriesHref(mangaId: number, cover: string) {
  if (mangaId > 0) return `/manga/${mangaId}`;
  const uuid = decodeURIComponent(cover).match(/covers\/([0-9a-f-]{36})\//i)?.[1];
  return uuid ? `/title/${uuid}` : "/browse?src=md";
}

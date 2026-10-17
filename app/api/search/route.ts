import { displayTitle, listManga } from "@/lib/anilist";
import { listMangaDex } from "@/lib/mangadex";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return Response.json({ results: [] });
  // AniList first; MangaDex adds the readable series AniList doesn't list
  const [al, md] = await Promise.all([
    listManga({ search: q, perPage: 8 }).then((r) => r.media, () => null),
    listMangaDex({ search: q, perPage: 8 }).then((r) => r.titles.filter((t) => !t.anilistId), () => []),
  ]);
  if (al || md.length) {
    const results = [
      ...(al ?? []).map((m) => ({
        id: m.id,
        href: `/manga/${m.id}`,
        title: displayTitle(m),
        cover: m.coverImage.large,
        year: m.startDate.year,
        country: m.countryOfOrigin,
        score: m.averageScore,
        color: m.coverImage.color,
        readable: !!m.readable,
      })),
      ...md.map((t) => ({ id: t.id, href: `/title/${t.id}`, title: t.title, cover: t.cover ?? "", year: t.year, country: t.country, score: null, color: null, readable: true })),
    ];
    return Response.json({ results: results.slice(0, 10) });
  }
  if (al) return Response.json({ results: [] });
  return Response.json({ results: [], error: "Search is unavailable right now." }, { status: 503 });
}

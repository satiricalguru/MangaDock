import { displayTitle, listManga } from "@/lib/anilist";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return Response.json({ results: [] });
  try {
    const { media } = await listManga({ search: q, perPage: 8 });
    return Response.json({
      results: media.map((m) => ({
        id: m.id,
        title: displayTitle(m),
        cover: m.coverImage.large,
        year: m.startDate.year,
        country: m.countryOfOrigin,
        score: m.averageScore,
        color: m.coverImage.color,
      })),
    });
  } catch {
    return Response.json({ results: [], error: "Search is unavailable right now." }, { status: 503 });
  }
}

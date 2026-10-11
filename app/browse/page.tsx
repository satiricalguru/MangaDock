import Link from "next/link";
import MangaCard from "@/components/MangaCard";
import { getGenres, listManga, type ListOptions } from "@/lib/anilist";

export const metadata = { title: "Browse" };

const SORTS: { value: NonNullable<ListOptions["sort"]>; label: string }[] = [
  { value: "TRENDING_DESC", label: "Trending" },
  { value: "POPULARITY_DESC", label: "Popular" },
  { value: "SCORE_DESC", label: "Top rated" },
  { value: "START_DATE_DESC", label: "Newest" },
];
const COUNTRIES = [
  { value: "", label: "All" },
  { value: "JP", label: "Manga" },
  { value: "KR", label: "Manhwa" },
  { value: "CN", label: "Manhua" },
];

type Search = { q?: string; genre?: string; country?: string; sort?: string; status?: string; page?: string };

export default async function Browse({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = (SORTS.find((s) => s.value === sp.sort)?.value ?? "TRENDING_DESC") as ListOptions["sort"];
  const country = (["JP", "KR", "CN"].includes(sp.country ?? "") ? sp.country : undefined) as ListOptions["country"];
  const status = (sp.status === "RELEASING" || sp.status === "FINISHED" ? sp.status : undefined) as ListOptions["status"];

  const [result, genres] = await Promise.all([
    listManga({ search: sp.q || undefined, genre: sp.genre || undefined, country, sort, status, page, perPage: 30 }).catch(() => null),
    getGenres().catch(() => [] as string[]),
  ]);

  const href = (patch: Partial<Search>) => {
    const next = { ...sp, page: undefined, ...patch };
    const q = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => v && q.set(k, String(v)));
    return `/browse?${q}`;
  };
  const chip = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm transition ${active ? "bg-magenta text-white shadow-[0_0_24px_-4px_#ff2e95]" : "bg-white/5 text-mist hover:bg-white/10 hover:text-white"}`;

  return (
    <div className="relative min-h-dvh overflow-hidden px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute hidden md:block -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-violet/40 blur-[120px]" />
      <div className="pointer-events-none absolute hidden md:block -right-40 top-40 h-[420px] w-[420px] rounded-full bg-magenta/30 blur-[120px]" />
      <div className="relative mx-auto max-w-7xl">
        <h1 className="font-display text-5xl font-black italic sm:text-7xl">
          {sp.q ? (
            <>
              Results for <span className="text-neon">“{sp.q}”</span>
            </>
          ) : (
            <>
              Browse <span className="text-neon">{sp.genre ?? "everything"}</span>
            </>
          )}
        </h1>

        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((c) => (
              <Link key={c.label} href={href({ country: c.value || undefined })} className={chip((sp.country ?? "") === c.value)}>
                {c.label}
              </Link>
            ))}
            <span className="mx-2 hidden w-px bg-white/10 sm:block" />
            {SORTS.map((s) => (
              <Link key={s.value} href={href({ sort: s.value })} className={chip(sort === s.value)}>
                {s.label}
              </Link>
            ))}
            <span className="mx-2 hidden w-px bg-white/10 sm:block" />
            <Link href={href({ status: sp.status === "RELEASING" ? undefined : "RELEASING" })} className={chip(sp.status === "RELEASING")}>
              Ongoing
            </Link>
            <Link href={href({ status: sp.status === "FINISHED" ? undefined : "FINISHED" })} className={chip(sp.status === "FINISHED")}>
              Completed
            </Link>
          </div>
          <div className="scrollbar-none -mx-6 flex gap-2 overflow-x-auto px-6">
            <Link href={href({ genre: undefined })} className={`${chip(!sp.genre)} shrink-0`}>
              All genres
            </Link>
            {genres.map((g) => (
              <Link key={g} href={href({ genre: g })} className={`${chip(sp.genre === g)} shrink-0`}>
                {g}
              </Link>
            ))}
          </div>
        </div>

        {!result ? (
          <div className="mt-16 text-mist">
            <p>Nothing came back from AniList. It sometimes hiccups for a moment.</p>
            <Link href={href({ page: sp.page })} className="mt-4 inline-block rounded-full bg-magenta px-5 py-2.5 text-sm font-semibold text-white">
              Try again
            </Link>
          </div>
        ) : result.media.length === 0 ? (
          <p className="mt-16 text-mist">Nothing matched “{sp.q}”. Try another spelling.</p>
        ) : (
          <>
            <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {result.media.map((m) => (
                <MangaCard key={m.id} m={m} />
              ))}
            </div>
            <div className="mt-14 flex justify-center gap-3">
              {page > 1 && (
                <Link href={href({ page: String(page - 1) })} className="rounded-full glass px-6 py-3 hover:bg-white/15">
                  ← Previous
                </Link>
              )}
              {result.pageInfo.hasNextPage && (
                <Link href={href({ page: String(page + 1) })} className="rounded-full bg-magenta px-6 py-3 font-semibold hover:bg-white hover:text-ink">
                  Next page →
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

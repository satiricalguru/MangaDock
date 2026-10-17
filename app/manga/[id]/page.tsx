import { cache, Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Rail from "@/components/Rail";
import ChapterList from "@/components/ChapterList";
import MangaActions from "@/components/MangaActions";
import Expandable from "@/components/Expandable";
import { COUNTRY_LABEL, displayTitle, getManga, plainText, type Media } from "@/lib/anilist";
import { getMalStats } from "@/lib/jikan";

const OFFICIAL = /webtoon|manga plus|mangaplus|viz|tapas|tappytoon|kakao|lezhin|comikey|azuki|inky|k manga|pocket comics|bilibili|shonen jump|kodansha|yen press|seven seas|crunchyroll|amazon|bookwalker|comixology/i;

// one AniList call shared by generateMetadata and the page
const load = cache(async (id: string) => {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  try {
    return await getManga(n);
  } catch (e) {
    if (/not found/i.test((e as Error).message)) notFound();
    throw e; // shown by app/error.tsx with a retry button
  }
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const m = await load((await params).id).catch(() => null);
  return m ? { title: displayTitle(m), description: plainText(m.description, 160) } : {};
}

export default async function MangaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const [{ id }, { lang = "en" }] = await Promise.all([params, searchParams]);
  const m = await load(id);
  const color = m.coverImage.color ?? "#ff2e95";
  // one button per platform (AniList often lists the same site for several regions)
  const official = [...new Map(m.externalLinks.filter((l) => OFFICIAL.test(l.site)).map((l) => [l.site.toLowerCase(), l])).values()];
  const recs = m.recommendations.nodes.map((n) => n.mediaRecommendation).filter(Boolean) as Media[];
  const titles = [m.title.english, m.title.romaji, m.title.native, ...m.synonyms].filter(Boolean) as string[];
  const tags = m.tags.filter((t) => !t.isMediaSpoiler && t.rank >= 60).slice(0, 10);

  return (
    <div className="relative">
      <div className="relative h-[52vh] min-h-80 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.bannerImage ?? m.coverImage.extraLarge} alt="" className="absolute inset-0 h-full w-full object-cover md:scale-110 md:blur-[2px]" />
        <div className="halftone absolute inset-0 mix-blend-overlay" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent, ${color}33 40%, #0b0712 100%)` }} />
      </div>

      <div className="relative mx-auto -mt-56 grid max-w-7xl gap-10 px-6 md:grid-cols-[280px_1fr]">
        <div className="min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.coverImage.extraLarge} alt={displayTitle(m)} className="page-in mx-auto w-48 rounded-3xl sm:w-56 md:mx-0 md:w-full" style={{ boxShadow: `0 30px 80px -20px ${color}` }} />
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {[
              ["Type", COUNTRY_LABEL[m.countryOfOrigin ?? "JP"] ?? m.format],
              ["Status", m.status?.replace(/_/g, " ").toLowerCase()],
              ["Chapters", m.chapters ?? "Ongoing"],
              ["Started", m.startDate.year],
              ["AniList", m.averageScore ? `${m.averageScore}%` : "–"],
            ].map(([k, v]) => (
              <div key={String(k)} className="glass rounded-2xl p-3">
                <dt className="text-[10px] uppercase tracking-widest text-mist">{k}</dt>
                <dd className="mt-1 font-semibold capitalize">{v ?? "–"}</dd>
              </div>
            ))}
            <div className="glass rounded-2xl p-3">
              <dt className="text-[10px] uppercase tracking-widest text-mist">MyAnimeList</dt>
              <dd className="mt-1 font-semibold">
                <Suspense fallback={<span className="text-mist">…</span>}>
                  <MalScore idMal={m.idMal} />
                </Suspense>
              </dd>
            </div>
          </dl>
        </div>

        <div className="min-w-0 md:pt-36">
          <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color }}>
            {m.genres.map((g, i) => (
              <span key={g}>
                {i > 0 && " · "}
                <Link href={`/browse?genre=${encodeURIComponent(g)}`} className="inline-block py-1.5 hover:underline">
                  {g}
                </Link>
              </span>
            ))}
          </p>
          <h1 className="mt-3 text-balance font-display text-4xl font-black italic leading-tight sm:text-6xl">{displayTitle(m)}</h1>
          {m.title.native && <p className="mt-2 text-mist">{m.title.native}</p>}
          <MangaActions mangaId={m.id} title={displayTitle(m)} cover={m.coverImage.large} color={color} />
          <Expandable text={plainText(m.description) || "No description yet."} />
          {m.staff.edges.length > 0 && <p className="mt-4 text-sm text-mist">{m.staff.edges.map((e) => `${e.node.name.full} (${e.role})`).join(" · ")}</p>}
          {tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map((t) => (
                <span key={t.name} className="rounded-full border border-white/10 px-3 py-1 text-xs text-mist">
                  #{t.name}
                </span>
              ))}
            </div>
          )}

          {official.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold">Read officially</p>
              <div className="flex flex-wrap gap-2">
                {official.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="press rounded-full border border-white/15 px-4 py-2.5 text-sm transition hover:border-lime hover:text-lime">
                    {l.site} ↗
                  </a>
                ))}
              </div>
            </div>
          )}

          {m.characters.edges.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-2xl font-black italic">Characters</h2>
              <div className="scrollbar-none mt-4 flex gap-4 overflow-x-auto pb-2">
                {m.characters.edges.map((c) => (
                  <div key={c.node.name.full} className="w-24 shrink-0 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.node.image.medium} alt="" loading="lazy" className="mx-auto h-24 w-24 rounded-full object-cover ring-2 ring-white/10" />
                    <p className="mt-2 line-clamp-2 text-xs font-semibold">{c.node.name.full}</p>
                    <p className="text-[10px] uppercase tracking-wider text-mist">{c.role.toLowerCase()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div id="chapters" className="mt-12 scroll-mt-28">
            <h2 className="font-display text-2xl font-black italic">Chapters</h2>
            <Suspense
              key={lang}
              fallback={
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="h-11 shimmer rounded-2xl" />
                  ))}
                </div>
              }
            >
              <ChapterList anilistId={m.id} malId={m.idMal} titles={titles} color={color} lang={lang} />
            </Suspense>
          </div>
        </div>
      </div>

      {recs.length > 0 && (
        <div className="mt-16">
          <Rail kicker="If you liked this" title="You might also love" items={recs} />
        </div>
      )}
      <p className="mx-auto max-w-7xl px-6 pb-16 text-xs text-mist/60">
        Info from{" "}
        <a className="underline" href={`https://anilist.co/manga/${m.id}`} target="_blank" rel="noreferrer">
          AniList
        </a>
        {m.idMal && (
          <>
            {" "}
            and{" "}
            <a className="underline" href={`https://myanimelist.net/manga/${m.idMal}`} target="_blank" rel="noreferrer">
              MyAnimeList
            </a>
          </>
        )}
        .
      </p>
    </div>
  );
}

async function MalScore({ idMal }: { idMal: number | null }) {
  const mal = await getMalStats(idMal);
  if (!mal?.score) return <>–</>;
  return (
    <a href={mal.url} target="_blank" rel="noreferrer" className="hover:underline">
      {mal.score}
      {mal.rank ? ` · #${mal.rank}` : ""}
    </a>
  );
}

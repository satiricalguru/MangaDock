import { cache } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ChapterGrid from "@/components/ChapterGrid";
import MangaActions from "@/components/MangaActions";
import Expandable from "@/components/Expandable";
import { COUNTRY_LABEL } from "@/lib/anilist";
import { getChapters, getMdTitle, LANG_NAMES, mdKey } from "@/lib/mangadex";

// Title page for series that are on MangaDex but not on AniList.
// Titles AniList does know are sent to /manga/[anilistId], which has richer info.

const load = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const t = await getMdTitle(id).catch((e) => {
    if (/404/.test((e as Error).message)) notFound();
    throw e;
  });
  if (!t) notFound();
  return t;
});

/** MangaDex descriptions are Markdown; keep the text, drop the link syntax and rules. */
const plain = (md: string) =>
  md
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await load((await params).id).catch(() => null);
  return t ? { title: t.title, description: plain(t.description).slice(0, 160) } : {};
}

export default async function TitlePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const [{ id }, { lang = "en" }] = await Promise.all([params, searchParams]);
  const t = await load(id);
  if (t.anilistId) redirect(`/manga/${t.anilistId}${lang !== "en" ? `?lang=${lang}` : ""}`);

  const key = mdKey(t.id);
  const color = "#ff2e95";
  const languages = t.languages.length ? t.languages : ["en"];
  const active = languages.includes(lang) ? lang : languages.includes("en") ? "en" : languages[0];
  const chapters = await getChapters(t.id, active).catch(() => null);
  const cover = t.cover ?? "/media/hero-poster.jpg";

  return (
    <div className="relative">
      <div className="relative h-[42vh] min-h-72 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 md:scale-110 md:blur-md" />
        <div className="halftone absolute inset-0 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-magenta/10 to-ink" />
      </div>

      <div className="relative mx-auto -mt-48 grid max-w-7xl gap-10 px-6 pb-20 md:grid-cols-[280px_1fr]">
        <div className="min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={t.title} className="page-in mx-auto w-48 rounded-3xl shadow-[0_30px_80px_-20px_#ff2e95] sm:w-56 md:mx-0 md:w-full" />
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {[
              ["Type", t.country ? COUNTRY_LABEL[t.country] : "Comic"],
              ["Status", t.status],
              ["Chapters", t.lastChapter ?? (chapters?.length || "–")],
              ["Started", t.year],
            ].map(([k, v]) => (
              <div key={String(k)} className="glass rounded-2xl p-3">
                <dt className="text-[10px] uppercase tracking-widest text-mist">{k}</dt>
                <dd className="mt-1 font-semibold capitalize">{v ?? "–"}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="min-w-0 md:pt-36">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-magenta">
            {t.genres.map((g, i) => (
              <span key={g}>
                {i > 0 && " · "}
                <Link href={`/browse?src=md&genre=${encodeURIComponent(g)}`} className="inline-block py-1.5 hover:underline">
                  {g}
                </Link>
              </span>
            ))}
          </p>
          <h1 className="mt-3 text-balance font-display text-4xl font-black italic leading-tight sm:text-6xl">{t.title}</h1>
          {t.altTitles[0] && <p className="mt-2 line-clamp-1 text-mist">{t.altTitles.slice(0, 3).join(" · ")}</p>}
          <MangaActions mangaId={key} title={t.title} cover={cover} color={color} />
          <Expandable text={plain(t.description) || "No description yet."} />
          {t.authors.length > 0 && <p className="mt-4 text-sm text-mist">{t.authors.join(" · ")}</p>}
          {t.themes.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {t.themes.slice(0, 10).map((name) => (
                <span key={name} className="rounded-full border border-white/10 px-3 py-1 text-xs text-mist">
                  #{name}
                </span>
              ))}
            </div>
          )}

          <div id="chapters" className="mt-12 scroll-mt-28">
            <h2 className="font-display text-2xl font-black italic">Chapters</h2>
            {languages.length > 1 && (
              <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto">
                {[active, ...languages.filter((l) => l !== active)].slice(0, 12).map((l) => (
                  <Link
                    key={l}
                    href={`/title/${t.id}?lang=${l}#chapters`}
                    scroll={false}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs ${l === active ? "bg-paper text-ink" : "bg-white/5 text-mist hover:bg-white/10"}`}
                  >
                    {LANG_NAMES[l] ?? l.toUpperCase()}
                  </Link>
                ))}
              </div>
            )}
            {!chapters ? (
              <p className="mt-4 text-mist">MangaDex didn&apos;t answer. Refresh the page to try again.</p>
            ) : chapters.length === 0 ? (
              <p className="mt-4 text-mist">No {LANG_NAMES[active] ?? active} chapters can be read here.</p>
            ) : (
              <ChapterGrid
                anilistId={key}
                color={color}
                chapters={chapters.map((c) => ({ id: c.id, chapter: c.chapter, title: c.title, group: c.groups[0]?.name ?? null, publishAt: c.publishAt }))}
              />
            )}
            <p className="mt-3 text-xs text-mist/70">
              Info and chapters via{" "}
              <a className="underline" href={`https://mangadex.org/title/${t.id}`} target="_blank" rel="noreferrer">
                MangaDex
              </a>
              , translated by the scanlation groups credited on each chapter.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

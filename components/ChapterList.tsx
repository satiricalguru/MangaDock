import Link from "next/link";
import ChapterGrid from "./ChapterGrid";
import { findMangaDex, getChapters, LANG_NAMES } from "@/lib/mangadex";

export default async function ChapterList({
  anilistId,
  malId,
  titles,
  color,
  lang,
}: {
  anilistId: number;
  malId: number | null;
  titles: string[];
  color: string;
  lang: string;
}) {
  let md;
  try {
    md = await findMangaDex(anilistId, titles, malId);
  } catch (err) {
    console.warn("[chapters] MangaDex lookup failed", anilistId, (err as Error).message);
    md = null;
  }
  if (!md) {
    return <p className="mt-4 text-mist">We couldn&apos;t find this title on MangaDex. Try one of the official links above.</p>;
  }

  const languages = md.languages.length ? md.languages : ["en"];
  const active = languages.includes(lang) ? lang : languages.includes("en") ? "en" : languages[0];
  let chapters: Awaited<ReturnType<typeof getChapters>> = [];
  let failed = false;
  try {
    chapters = await getChapters(md.id, active);
  } catch (err) {
    console.warn("[chapters] feed failed", md.id, (err as Error).message);
    failed = true;
  }

  const langChips = languages.length > 1 && (
    <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto">
      {[active, ...languages.filter((l) => l !== active)].slice(0, 12).map((l) => (
        <Link
          key={l}
          href={`/manga/${anilistId}?lang=${l}#chapters`}
          scroll={false}
          className={`shrink-0 rounded-full px-3 py-1 text-xs ${l === active ? "bg-paper text-ink" : "bg-white/5 text-mist hover:bg-white/10"}`}
        >
          {LANG_NAMES[l] ?? l.toUpperCase()}
        </Link>
      ))}
    </div>
  );

  return (
    <>
      {langChips}
      {failed ? (
        <p className="mt-4 text-mist">MangaDex didn&apos;t answer. Refresh the page to try again.</p>
      ) : chapters.length === 0 ? (
        <p className="mt-4 text-mist">
          No {LANG_NAMES[active] ?? active} chapters can be read here. This usually means the series is licensed, so please read it on an official platform.
        </p>
      ) : (
        <ChapterGrid
          anilistId={anilistId}
          color={color}
          chapters={chapters.map((c) => ({ id: c.id, chapter: c.chapter, title: c.title, group: c.groups[0]?.name ?? null, publishAt: c.publishAt }))}
        />
      )}
      <p className="mt-3 text-xs text-mist/70">
        Chapters via{" "}
        <a className="underline" href={`https://mangadex.org/title/${md.id}`} target="_blank" rel="noreferrer">
          MangaDex
        </a>
        , translated by the scanlation groups credited on each chapter.
      </p>
    </>
  );
}

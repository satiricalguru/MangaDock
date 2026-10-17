import Link from "next/link";
import { notFound } from "next/navigation";
import Reader from "@/components/Reader";
import { displayTitle, getManga } from "@/lib/anilist";
import { getChapter, getChapters, getMdTitle, getPages, mdKey } from "@/lib/mangadex";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reader" };

export default async function ReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<{ m?: string; saver?: string; p?: string }>;
}) {
  const { chapterId } = await params;
  const { m, saver, p } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(chapterId)) notFound();

  const chapter = await getChapter(chapterId).catch(() => null);
  if (!chapter) notFound();

  if (chapter.externalUrl) {
    return (
      <div className="mx-auto max-w-xl px-6 pb-24 pt-40 text-center">
        <h1 className="font-display text-3xl font-black italic">This chapter is hosted officially</h1>
        <a href={chapter.externalUrl} target="_blank" rel="noreferrer" className="mt-6 inline-block rounded-full bg-magenta px-6 py-3 font-semibold">
          Read it on the publisher&apos;s site ↗
        </a>
      </div>
    );
  }

  // m is the AniList id, or a negative key for titles that only exist on MangaDex (see mdKey)
  const key = Number(m) || null;
  const anilistId = key && key > 0 ? key : null;
  const mdOnly = !!(key && key < 0 && chapter.mangaId && mdKey(chapter.mangaId) === key);
  const dataSaver = saver === "1";
  const [pages, list, series] = await Promise.all([
    getPages(chapterId, dataSaver).catch(() => [] as string[]),
    chapter.mangaId ? getChapters(chapter.mangaId, chapter.language).catch(() => []) : Promise.resolve([]),
    anilistId
      ? getManga(anilistId).then((s) => ({ id: anilistId, title: displayTitle(s), cover: s.coverImage.large }), () => null)
      : mdOnly
        ? getMdTitle(chapter.mangaId!).then((t) => (t ? { id: key!, title: t.title, cover: t.cover ?? "" } : null), () => null)
        : Promise.resolve(null),
  ]);
  // every page goes through our proxy (see app/api/page/route.ts)
  const proxiedPages = pages.map((u) => `/api/page?u=${encodeURIComponent(u)}`);
  const i = list.findIndex((c) => c.id === chapterId || (chapter.chapter && c.chapter === chapter.chapter));
  const prev = i > 0 ? list[i - 1] : null;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  const back = anilistId ? `/manga/${anilistId}` : chapter.mangaId ? `/title/${chapter.mangaId}` : "/browse";
  const qs = (extra: Record<string, string>) => new URLSearchParams({ ...(m ? { m } : {}), ...extra }).toString();
  const href = (id: string) => `/read/${id}?${qs(dataSaver ? { saver: "1" } : {})}`;

  return (
    <Reader
      chapterId={chapterId}
      chapterNum={chapter.chapter}
      pages={proxiedPages}
      startPage={Math.max(0, Number(p) || 0)}
      series={series}
      title={`Chapter ${chapter.chapter ?? "?"}${chapter.title ? `: ${chapter.title}` : ""}`}
      backHref={back}
      prevHref={prev ? href(prev.id) : null}
      nextHref={next ? href(next.id) : null}
      saverHref={`/read/${chapterId}?${qs(dataSaver ? {} : { saver: "1" })}`}
      dataSaver={dataSaver}
      credits={
        <>
          Translated by{" "}
          {chapter.groups.length
            ? chapter.groups.map((g, k) => (
                <span key={g.id}>
                  {k > 0 && ", "}
                  <a className="text-paper underline" href={g.website ?? `https://mangadex.org/group/${g.id}`} target="_blank" rel="noreferrer">
                    {g.name}
                  </a>
                </span>
              ))
            : "an unknown group"}{" "}
          · served by{" "}
          <Link className="text-paper underline" href={`https://mangadex.org/chapter/${chapterId}`} target="_blank">
            MangaDex
          </Link>
        </>
      }
    />
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getContinue, getLibrary, progressHref, setLibrary } from "@/lib/track";
import type { LibraryItem, ProgressItem } from "@/lib/types";
import { seriesHref } from "@/lib/ui";

const TABS = [
  { id: "continue", label: "Continue reading" },
  { id: "reading", label: "Reading" },
  { id: "plan", label: "Plan to read" },
  { id: "completed", label: "Completed" },
  { id: "favorite", label: "Favourites" },
  { id: "history", label: "History" },
];

function ago(ts: number) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export default function LibraryView({ initialTab }: { initialTab: string }) {
  const router = useRouter();
  const [tab, setTab] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : "continue");
  const [progress, setProgress] = useState<ProgressItem[] | null>(null);
  const [library, setLib] = useState<LibraryItem[] | null>(null);

  useEffect(() => {
    getContinue().then((r) => setProgress(r.items));
    getLibrary().then((r) => setLib(r.items));
  }, []);

  const pick = (id: string) => {
    setTab(id);
    router.replace(`/library?tab=${id}`, { scroll: false });
  };

  const counts: Record<string, number> = {
    continue: progress?.filter((p) => p.page < p.pages - 1).length ?? 0,
    history: progress?.length ?? 0,
  };
  for (const s of ["reading", "plan", "completed", "favorite"]) counts[s] = library?.filter((l) => l.status === s).length ?? 0;

  const loading = progress === null || library === null;
  const remove = async (item: LibraryItem) => {
    setLib((l) => l?.filter((x) => x.mangaId !== item.mangaId) ?? null);
    await setLibrary(item.mangaId, null, item.title, item.cover);
  };

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="aspect-[2/3] shimmer rounded-[18px]" />
        ))}
      </div>
    );
  } else if (tab === "continue" || tab === "history") {
    const items = tab === "continue" ? progress!.filter((p) => p.page < p.pages - 1).concat(progress!.filter((p) => p.page >= p.pages - 1)).slice(0, 24) : progress!;
    body = items.length ? (
      tab === "history" ? (
        <ul className="mt-10 divide-y divide-white/5">
          {items.map((p) => (
            <li key={p.mangaId}>
              <Link href={progressHref(p)} className="flex items-center gap-4 rounded-2xl px-3 py-3 transition hover:bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.cover} alt="" className="h-16 w-11 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.title}</p>
                  <p className="text-sm text-mist">
                    Chapter {p.chapterNum ?? "?"} · page {p.page + 1} of {p.pages}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-mist">{ago(p.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((p) => (
            <Link key={p.mangaId} href={progressHref(p)} className="group block">
              <div className="relative aspect-[2/3] overflow-hidden rounded-[18px] bg-ink-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.cover} alt="" className="h-full w-full object-cover transition duration-700 ease-glide group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent" />
                <span className="absolute inset-x-3 bottom-3 rounded-full bg-paper/90 py-1.5 text-center text-xs font-semibold text-ink opacity-0 transition group-hover:opacity-100">
                  ↺ Resume
                </span>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                  <div className="h-full bg-gradient-to-r from-magenta to-cyan" style={{ width: `${((p.page + 1) / Math.max(p.pages, 1)) * 100}%` }} />
                </div>
              </div>
              <p className="mt-3 line-clamp-1 text-sm font-semibold">{p.title}</p>
              <p className="text-xs text-mist">
                Ch. {p.chapterNum ?? "?"} · p. {p.page + 1}/{p.pages}
              </p>
            </Link>
          ))}
        </div>
      )
    ) : (
      <Empty text="Nothing here yet. Open any chapter and we'll remember exactly where you stopped." />
    );
  } else {
    const items = library!.filter((l) => l.status === tab);
    body = items.length ? (
      <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((l) => (
          <div key={l.mangaId} className="group relative">
            <Link href={seriesHref(l.mangaId, l.cover)} className="block">
              <div className="aspect-[2/3] overflow-hidden rounded-[18px] bg-ink-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.cover} alt="" className="h-full w-full object-cover transition duration-700 ease-glide group-hover:scale-105" />
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-semibold">{l.title}</p>
            </Link>
            <button
              onClick={() => remove(l)}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-sm opacity-0 transition md:backdrop-blur hover:bg-magenta group-hover:opacity-100"
              aria-label={`Remove ${l.title}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    ) : (
      <Empty text="Use “Add to library” on any title page to fill this shelf." />
    );
  }

  return (
    <>
      <div className="scrollbar-none -mx-6 mt-10 flex gap-2 overflow-x-auto px-6" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => pick(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${tab === t.id ? "bg-magenta text-white shadow-[0_0_24px_-4px_#ff2e95]" : "bg-white/5 text-mist hover:bg-white/10 hover:text-white"}`}
          >
            {t.label}
            {!loading && counts[t.id] > 0 && <span className="ml-2 rounded-full bg-white/15 px-1.5 text-xs">{counts[t.id]}</span>}
          </button>
        ))}
      </div>
      {body}
    </>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-12 flex flex-col items-center rounded-[32px] border border-dashed border-white/15 px-6 py-16 text-center">
      <p className="font-display text-6xl">📚</p>
      <p className="mt-4 max-w-sm text-mist">{text}</p>
      <div className="mt-6 flex gap-3">
        <Link href="/browse" className="rounded-full bg-magenta px-5 py-2.5 text-sm font-semibold hover:bg-white hover:text-ink">
          Browse manga
        </Link>
        <Link href="/random" prefetch={false} className="rounded-full glass px-5 py-2.5 text-sm font-semibold hover:bg-white/15">
          🎲 Surprise me
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getContinue, progressHref } from "@/lib/track";
import type { ProgressItem } from "@/lib/types";
import { RAIL_PAD } from "@/lib/ui";

/** "Continue reading" row on the homepage. Hidden until there is something to continue. */
export default function ContinueRail() {
  const [items, setItems] = useState<ProgressItem[]>([]);
  useEffect(() => {
    getContinue().then((r) => setItems(r.items.slice(0, 12)));
  }, []);
  if (items.length === 0) return null;

  return (
    <section className="relative z-10 py-12">
      <div className="mx-auto flex max-w-7xl items-end px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-lime">Welcome back</p>
          <h2 className="mt-2 font-display text-3xl font-black italic sm:text-4xl">Continue reading</h2>
        </div>
        <Link href="/library?tab=history" className="ml-auto rounded-full border border-white/20 px-4 py-2 text-sm transition hover:border-lime hover:text-lime">
          History
        </Link>
      </div>
      <div className="scrollbar-none mt-6 flex snap-x gap-4 overflow-x-auto pb-4" style={RAIL_PAD}>
        {items.map((p) => (
          <Link key={p.mangaId} href={progressHref(p)} className="glass group flex w-[min(20rem,85vw)] shrink-0 snap-start items-center gap-4 rounded-3xl p-3 transition hover:-translate-y-1 hover:bg-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.cover} alt="" className="h-24 w-16 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold">{p.title}</p>
              <p className="mt-1 text-xs text-mist">
                Chapter {p.chapterNum ?? "?"} · page {p.page + 1}/{p.pages}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-magenta to-cyan" style={{ width: `${((p.page + 1) / Math.max(p.pages, 1)) * 100}%` }} />
              </div>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-ink transition group-hover:bg-lime">▶</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getMangaState } from "@/lib/track";

interface Ch {
  id: string;
  chapter: string | null;
  title: string | null;
  group: string | null;
  publishAt: string;
}

export default function ChapterGrid({ chapters, anilistId, color }: { chapters: Ch[]; anilistId: number; color: string }) {
  const [reads, setReads] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);

  useEffect(() => {
    getMangaState(anilistId).then((s) => setReads(s.reads));
  }, [anilistId]);

  const list = useMemo(() => {
    const filtered = query ? chapters.filter((c) => (c.chapter ?? "").startsWith(query.trim()) || (c.title ?? "").toLowerCase().includes(query.toLowerCase())) : chapters;
    return newestFirst ? [...filtered].reverse() : filtered;
  }, [chapters, query, newestFirst]);

  const first = chapters[0];
  const latest = chapters[chapters.length - 1];
  const nextUnread = chapters.find((c) => !reads.has(c.id));

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-3">
        <Link href={`/read/${first.id}?m=${anilistId}`} className="rounded-full px-6 py-3 font-semibold text-ink transition hover:scale-105" style={{ background: color }}>
          Start ch. {first.chapter ?? "1"}
        </Link>
        {reads.size > 0 && nextUnread && nextUnread.id !== first.id && (
          <Link href={`/read/${nextUnread.id}?m=${anilistId}`} className="rounded-full bg-lime px-6 py-3 font-semibold text-ink transition hover:scale-105">
            Next unread: ch. {nextUnread.chapter}
          </Link>
        )}
        <Link href={`/read/${latest.id}?m=${anilistId}`} className="rounded-full glass px-6 py-3 font-semibold transition hover:bg-white/15">
          Latest: ch. {latest.chapter ?? "?"}
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-3 text-sm">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jump to chapter…"
          inputMode="search"
          className="w-48 rounded-full bg-white/5 px-4 py-2 outline-none ring-magenta/50 placeholder:text-mist/60 focus:ring-2"
          aria-label="Filter chapters"
        />
        <button onClick={() => setNewestFirst((n) => !n)} className="rounded-full bg-white/5 px-4 py-2 text-mist hover:bg-white/10 hover:text-white">
          {newestFirst ? "Newest first ↓" : "Oldest first ↑"}
        </button>
        <span className="ml-auto text-xs text-mist">
          {reads.size > 0 ? `${Math.min(reads.size, chapters.length)} / ` : ""}
          {chapters.length} chapters
        </span>
      </div>

      <ul className="mt-4 grid max-h-[520px] gap-2 overflow-y-auto pr-2 sm:grid-cols-2" data-lenis-prevent>
        {list.map((c) => {
          const read = reads.has(c.id);
          return (
            <li key={c.id}>
              <Link href={`/read/${c.id}?m=${anilistId}`} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition hover:bg-white/10 ${read ? "bg-white/[0.02] text-mist" : "bg-white/5"}`}>
                <span className="w-10 shrink-0 font-display font-black italic" style={{ color: read ? undefined : color }}>
                  {c.chapter ?? "–"}
                </span>
                <span className="min-w-0 flex-1 truncate">{c.title || `Chapter ${c.chapter ?? ""}`}</span>
                {read ? <span className="text-lime" title="Read">✓</span> : <span className="shrink-0 truncate text-xs text-mist">{c.group}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

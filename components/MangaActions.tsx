"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { getMangaState, progressHref, setLibrary } from "@/lib/track";
import type { LibraryStatus, ProgressItem } from "@/lib/types";

const OPTIONS: { value: LibraryStatus; label: string; icon: string }[] = [
  { value: "reading", label: "Reading", icon: "📖" },
  { value: "plan", label: "Plan to read", icon: "🔖" },
  { value: "completed", label: "Completed", icon: "✓" },
  { value: "favorite", label: "Favourite", icon: "♥" },
];

export default function MangaActions({ mangaId, title, cover, color }: { mangaId: number; title: string; cover: string; color: string }) {
  const [progress, setProgress] = useState<ProgressItem | null>(null);
  const [status, setStatus] = useState<LibraryStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    getMangaState(mangaId).then((s) => {
      setProgress(s.progress);
      setStatus(s.status);
    });
  }, [mangaId]);

  const choose = (s: LibraryStatus | null) => {
    setStatus(s);
    setOpen(false);
    setLibrary(mangaId, s, title, cover);
    const o = OPTIONS.find((x) => x.value === s);
    setToast({ text: o ? `${o.icon} Saved to ${o.label}` : "Removed from your library", id: Date.now() });
  };
  const current = OPTIONS.find((o) => o.value === status);

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      {progress && (
        <Link href={progressHref(progress)} className="press rounded-full px-6 py-3 font-semibold text-ink shadow-[0_0_40px_-8px_var(--c)] transition hover:scale-105" style={{ background: color, ["--c" as string]: color }}>
          ↺ Continue ch. {progress.chapterNum ?? "?"}
          {progress.page > 0 ? ` · p. ${progress.page + 1}` : ""}
        </Link>
      )}
      <div className="relative" ref={box}>
        <button onClick={() => setOpen((o) => !o)} className={`press min-h-11 rounded-full px-5 py-3 text-sm font-semibold transition ${current ? "bg-white/15" : "glass hover:bg-white/15"}`} aria-expanded={open}>
          {current ? `${current.icon} ${current.label}` : "+ Add to library"}
        </button>
        {open && (
          <div className="glass page-in absolute left-0 z-30 mt-2 w-52 rounded-3xl p-2 text-sm">
            {OPTIONS.map((o) => (
              <button key={o.value} onClick={() => choose(o.value)} className={`flex min-h-10 w-full items-center gap-2 rounded-2xl px-3 py-2 text-left hover:bg-white/10 ${status === o.value ? "text-lime" : ""}`}>
                <span className="w-5 text-center">{o.icon}</span> {o.label}
              </button>
            ))}
            {status && (
              <button onClick={() => choose(null)} className="w-full rounded-2xl px-3 py-2 text-left text-magenta hover:bg-white/10">
                Remove from library
              </button>
            )}
          </div>
        )}
      </div>
      {toast &&
        createPortal(
        <div key={toast.id} role="status" className="toast-in fixed bottom-24 left-1/2 z-[60] rounded-full border border-white/15 bg-ink/90 px-5 py-3 text-sm font-semibold shadow-[0_10px_40px_-10px_#ff2e95] md:bottom-8 md:backdrop-blur-xl">
          {toast.text}
        </div>,
          document.body,
        )}
    </div>
  );
}

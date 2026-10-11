"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Result {
  id: number;
  title: string;
  cover: string;
  year: number | null;
  country: string | null;
  score: number | null;
  color: string | null;
}

const LABEL: Record<string, string> = { JP: "Manga", KR: "Manhwa", CN: "Manhua", TW: "Manhua" };

/** Quick search overlay. Opens with ⌘K / Ctrl K, "/" or the search button. */
export default function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? "");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("ni:search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ni:search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal }).then((x) => x.json());
        setResults(r.results ?? []);
        setError(r.error ?? null);
        setActive(0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Search is unavailable right now.");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (path: string) => {
    setOpen(false);
    setQ("");
    router.push(path);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-ink/90 px-4 pt-[12vh] md:bg-ink/70 md:backdrop-blur-md" onClick={() => setOpen(false)} data-lenis-prevent>
      <div className="glass w-full max-w-xl overflow-hidden rounded-3xl shadow-[0_40px_120px_-20px_#6120ee]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Search manga">
        <div className="flex items-center gap-3 border-b border-white/10 px-5">
          <span className="text-mist">⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
              if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
              if (e.key === "Enter") go(results[active] ? `/manga/${results[active].id}` : `/browse?q=${encodeURIComponent(q)}`);
            }}
            placeholder="Search manga, manhwa, manhua…"
            className="w-full bg-transparent py-5 text-lg outline-none placeholder:text-mist/60"
            aria-label="Search"
          />
          <kbd className="rounded-md border border-white/15 px-2 py-0.5 text-xs text-mist">esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {loading && results.length === 0 && <li className="animate-pulse px-4 py-6 text-center text-sm text-mist">Searching…</li>}
          {error && <li className="px-4 py-6 text-center text-sm text-mist">{error}</li>}
          {!loading && !error && q.trim().length >= 2 && results.length === 0 && <li className="px-4 py-6 text-center text-sm text-mist">No matches. Press Enter to search everything.</li>}
          {q.trim().length < 2 && <li className="px-4 py-6 text-center text-sm text-mist">Type at least 2 letters. Tip: press / anywhere to search.</li>}
          {results.map((r, i) => (
            <li key={r.id}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(`/manga/${r.id}`)}
                className={`flex w-full items-center gap-4 rounded-2xl p-2.5 text-left transition ${i === active ? "bg-white/10" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.cover} alt="" className="h-16 w-11 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.title}</span>
                  <span className="text-xs text-mist">
                    {LABEL[r.country ?? "JP"] ?? "Manga"}
                    {r.year ? ` · ${r.year}` : ""}
                    {r.score ? ` · ★ ${r.score / 10}` : ""}
                  </span>
                </span>
                <span className="h-2 w-2 rounded-full" style={{ background: r.color ?? "#ff2e95" }} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveProgress } from "@/lib/track";

interface Props {
  chapterId: string;
  chapterNum: string | null;
  pages: string[];
  startPage: number;
  series: { id: number; title: string; cover: string } | null;
  title: string;
  backHref: string;
  prevHref: string | null;
  nextHref: string | null;
  saverHref: string;
  dataSaver: boolean;
  credits: React.ReactNode;
}

type Mode = "strip" | "paged";
type Direction = "ltr" | "rtl";

function readPref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback;
  } catch {
    return fallback;
  }
}

export default function Reader(props: Props) {
  const { chapterId, chapterNum, pages, startPage, series, title, backHref, prevHref, nextHref, saverHref, dataSaver, credits } = props;
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("strip");
  const [direction, setDirection] = useState<Direction>("ltr");
  const [width, setWidth] = useState(760);
  const [page, setPage] = useState(Math.min(startPage, Math.max(pages.length - 1, 0)));
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [tries, setTries] = useState<Record<number, number>>({});
  const [chrome, setChrome] = useState(true);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const pageRef = useRef(page);
  pageRef.current = page;

  useEffect(() => {
    setMode(readPref<Mode>("ni:mode", "strip"));
    setDirection(readPref<Direction>("ni:direction", "ltr"));
    setWidth(Number(readPref("ni:width", "760")) || 760);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("ni:mode", mode);
      localStorage.setItem("ni:direction", direction);
      localStorage.setItem("ni:width", String(width));
    } catch {}
  }, [mode, direction, width]);

  // --- progress tracking -------------------------------------------------
  const persist = useCallback(
    (beacon = false) => {
      if (!series || pages.length === 0) return;
      saveProgress(
        { mangaId: series.id, chapterId, chapterNum, page: pageRef.current, pages: pages.length, title: series.title, cover: series.cover },
        beacon,
      );
    },
    [series, chapterId, chapterNum, pages.length],
  );
  useEffect(() => {
    persist();
    const t = setInterval(() => persist(), 8000);
    const onHide = () => document.visibilityState === "hidden" && persist(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", () => persist(true));
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onHide);
      persist();
    };
  }, [persist]);

  // strip mode: the current page is whichever image crosses the middle of the screen
  useEffect(() => {
    if (mode !== "strip") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setPage(Number((e.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    imgs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [mode, pages, tries]);

  // resume: jump to the saved page once it has loaded
  const [resumed, setResumed] = useState(startPage === 0);
  const jumpTo = useCallback(
    (i: number) => {
      const el = imgs.current[i];
      if (!el) return;
      const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement, o: object) => void } }).__lenis;
      if (lenis) lenis.scrollTo(el, { offset: -90, immediate: true });
      else el.scrollIntoView();
    },
    [],
  );
  const onImgLoad = (i: number) => {
    if (!resumed && mode === "strip" && i === startPage) {
      setResumed(true);
      requestAnimationFrame(() => jumpTo(startPage));
    }
  };

  // --- keyboard ------------------------------------------------------------
  const go = useCallback(
    (dir: 1 | -1) => {
      if (mode === "paged") {
        const n = pageRef.current + dir;
        if (n >= 0 && n < pages.length) {
          setPage(n);
          window.scrollTo({ top: 0 });
          return;
        }
      }
      if (dir === 1 && nextHref) router.push(nextHref);
      if (dir === -1 && prevHref) router.push(prevHref);
    },
    [mode, pages.length, nextHref, prevHref, router],
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const forwardKey = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
      const backKey = direction === "rtl" ? "ArrowRight" : "ArrowLeft";

      if (e.key === forwardKey || (mode === "paged" && e.key === " ")) {
        e.preventDefault();
        go(1);
      }
      if (e.key === backKey) go(-1);
      if (e.key === "m") setMode((m) => (m === "strip" ? "paged" : "strip"));
      if (e.key === "r" && mode === "paged") setDirection((d) => (d === "ltr" ? "rtl" : "ltr"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, mode, direction]);

  const progress = pages.length ? (page + 1) / pages.length : 0;
  const retry = (i: number) => {
    setFailed((f) => {
      const n = new Set(f);
      n.delete(i);
      return n;
    });
    setTries((t) => ({ ...t, [i]: (t[i] ?? 0) + 1 }));
  };
  // a page that fails is retried automatically twice before we show a manual retry
  const onImgError = (i: number) => {
    if ((tries[i] ?? 0) < 2) setTimeout(() => setTries((t) => ({ ...t, [i]: (t[i] ?? 0) + 1 })), 1500);
    else setFailed((f) => new Set(f).add(i));
  };

  const pageImg = (src: string, i: number, eager: boolean) =>
    failed.has(i) ? (
      <button key={`f${i}`} onClick={() => retry(i)} className="flex aspect-[2/3] w-full items-center justify-center bg-white/5 text-sm text-mist">
        Page {i + 1} didn&apos;t load. Tap to retry.
      </button>
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={`${src}-${tries[i] ?? 0}`}
        ref={(el) => {
          imgs.current[i] = el;
        }}
        data-index={i}
        src={tries[i] ? `${src}&r=${tries[i]}` : src}
        alt={`Page ${i + 1}`}
        loading={eager ? "eager" : "lazy"}
        onLoad={() => onImgLoad(i)}
        onError={() => onImgError(i)}
        className="min-h-[30vh] w-full select-none bg-white/[0.02]"
      />
    );

  const navBtn = "rounded-full px-5 py-2.5 text-sm font-semibold transition";

  return (
    <div className="min-h-dvh bg-ink pb-24 pt-4">
      <div className="fixed inset-x-0 top-0 z-[60] h-1 bg-white/5">
        <div className="h-full bg-gradient-to-r from-magenta via-lavender to-cyan transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className={`glass sticky top-3 z-40 mx-3 flex max-w-3xl items-center gap-1.5 rounded-full px-2 py-1.5 text-sm transition duration-500 ease-glide sm:mx-auto sm:gap-2 sm:px-3 ${chrome ? "" : "pointer-events-none -translate-y-6 opacity-0"}`}>
        <Link href={backHref} className="press grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white/10" aria-label="Back to series">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{title}</p>
          {series && <p className="truncate text-[11px] text-mist">{series.title}</p>}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-mist">
          {pages.length ? page + 1 : 0}/{pages.length}
        </span>
        <div className="flex shrink-0 rounded-full bg-white/5 p-0.5 text-xs">
          {(["strip", "paged"] as Mode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`min-h-9 rounded-full px-2.5 capitalize transition sm:px-3 ${mode === m ? "bg-paper text-ink" : "text-mist hover:text-white"}`}>
              {m}
            </button>
          ))}
        </div>
        {mode === "paged" && (
          <button
            onClick={() => setDirection((d) => (d === "ltr" ? "rtl" : "ltr"))}
            title={`Reading direction: ${direction.toUpperCase()} (click or press R to toggle)`}
            className="flex min-h-9 shrink-0 items-center rounded-full bg-white/5 px-2.5 text-xs font-semibold text-mist hover:text-white sm:px-3"
          >
            {direction.toUpperCase()}
          </button>
        )}
        <label className="hidden items-center gap-2 text-xs text-mist md:flex">
          <input type="range" min={480} max={1100} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-20 accent-magenta" aria-label="Page width" />
        </label>
        <Link href={saverHref} className="flex min-h-9 shrink-0 items-center rounded-full px-2 text-xs text-mist hover:bg-white/10 sm:px-3">
          {dataSaver ? "HD" : "Saver"}
        </Link>
      </div>

      {!resumed && startPage > 0 && mode === "strip" && (
        <button onClick={() => (setResumed(true), jumpTo(startPage))} className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-magenta px-5 py-3 text-sm font-semibold shadow-[0_0_40px_-8px_#ff2e95] lg:bottom-8">
          ↺ Jump to page {startPage + 1}
        </button>
      )}

      {pages.length === 0 ? (
        <div className="page-in mx-auto mt-20 max-w-md px-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-magenta/15 text-3xl">⌁</div>
          <h2 className="mt-5 font-display text-2xl font-black italic">This chapter&apos;s pages aren&apos;t available</h2>
          <p className="mt-3 text-sm text-mist">
            MangaDex isn&apos;t serving pages for it right now. That usually means it was removed at the publisher&apos;s request, or a server is having a moment.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => router.refresh()} className="press min-h-11 rounded-full bg-magenta px-5 py-2.5 font-semibold text-white hover:bg-white hover:text-ink">
              Try again
            </button>
            <Link href={`${backHref}#chapters`} className="press glass flex min-h-11 items-center rounded-full px-5 py-2.5 font-semibold hover:bg-white/15">
              Pick another chapter
            </Link>
          </div>
        </div>
      ) : mode === "strip" ? (
        <div className="mx-auto mt-8 flex flex-col" style={{ maxWidth: width }} onDoubleClick={() => setChrome((c) => !c)}>
          {pages.map((src, i) => pageImg(src, i, i < 3 || i <= startPage))}
        </div>
      ) : (
        <div className="relative mx-auto mt-8" style={{ maxWidth: width }}>
          {pageImg(pages[page], page, true)}
          {/* tap zones */}
          {direction === "rtl" ? (
            <>
              <button aria-label="Next page" onClick={() => go(1)} className="absolute inset-y-0 left-0 w-2/3 cursor-w-resize" />
              <button aria-label="Previous page" onClick={() => go(-1)} className="absolute inset-y-0 right-0 w-1/3 cursor-e-resize" />
            </>
          ) : (
            <>
              <button aria-label="Previous page" onClick={() => go(-1)} className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize" />
              <button aria-label="Next page" onClick={() => go(1)} className="absolute inset-y-0 right-0 w-2/3 cursor-e-resize" />
            </>
          )}
          {/* preload the next two pages */}
          <div className="hidden">
            {pages.slice(page + 1, page + 3).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" />
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto mt-12 flex max-w-3xl flex-col items-center gap-6 px-6 text-center">
        <div className="flex gap-3">
          {prevHref && (
            <Link href={prevHref} className={`${navBtn} glass hover:bg-white/15`}>
              ← Previous chapter
            </Link>
          )}
          {nextHref ? (
            <Link href={nextHref} className={`${navBtn} bg-magenta hover:bg-white hover:text-ink`}>
              Next chapter →
            </Link>
          ) : pages.length > 0 ? (
            <Link href={backHref} className={`${navBtn} bg-lime text-ink`}>
              You&apos;re caught up!
            </Link>
          ) : null}
        </div>
        <p className="text-xs text-mist">{credits}</p>
        <p className="text-xs text-mist/60">
          ← → change {mode === "paged" ? (direction === "rtl" ? "pages (RTL: ← next, → prev)" : "pages") : "chapters"} · M switches strip / paged {mode === "paged" ? "· R toggles LTR/RTL" : ""} · double-click hides the toolbar
        </p>
      </div>
    </div>
  );
}

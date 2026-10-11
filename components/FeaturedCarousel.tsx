"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface Featured {
  id: number;
  title: string;
  banner: string;
  cover: string;
  color: string;
  blurb: string;
  genres: string[];
  score: number | null;
  kind: string;
}

const DURATION = 7000;

/** Auto-rotating spotlight for the top trending titles. Swipe, arrows, dots, pauses on hover. */
export default function FeaturedCarousel({ items }: { items: Featured[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0); // restarts the progress bar
  const touch = useRef<number | null>(null);
  // phones mount only the active slide's art; wider screens keep every layer for the crossfade
  const [wide, setWide] = useState(false);
  const n = items.length;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (pointer: fine)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const go = useCallback((d: number) => {
    setI((x) => (x + d + n) % n);
    setTick((t) => t + 1);
  }, [n]);

  useEffect(() => {
    if (paused || n < 2) return;
    const t = setTimeout(() => go(1), DURATION);
    return () => clearTimeout(t);
  }, [i, paused, go, n, tick]);

  if (!n) return null;
  const m = items[i];

  return (
    <section
      className="relative z-10 px-4 py-16 sm:px-6 sm:py-20"
      aria-roledescription="carousel"
      aria-label="Featured series"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-white/10 bg-ink-2 md:shadow-[0_40px_120px_-40px_var(--c)] transition-shadow duration-700" style={{ ["--c" as string]: m.color }} data-reveal>
        {/* art layers crossfade */}
        <div className="absolute inset-0">
          {items.map((it, k) => (wide || k === i) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={it.id}
              src={it.banner}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1400ms] ease-glide ${k === i ? "scale-100 opacity-100" : "scale-110 opacity-0"}`}
            />
          ))}
          <div className="halftone absolute inset-0 hidden opacity-40 mix-blend-overlay md:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/10 md:bg-gradient-to-r md:from-ink md:via-ink/75 md:to-transparent" />
        </div>

        <div className="relative grid min-h-[30rem] items-end gap-8 p-6 sm:p-10 md:min-h-[34rem] md:grid-cols-[1fr_auto] md:items-center md:p-14">
          <div key={m.id} className="max-w-xl">
            <p className="page-in text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: m.color }}>
              #{i + 1} trending · {m.kind}
              {m.score ? ` · ★ ${m.score / 10}` : ""}
            </p>
            <h2 className="page-in mt-3 text-balance font-display text-3xl font-black italic leading-[1.05] [animation-delay:80ms] sm:text-5xl lg:text-6xl">{m.title}</h2>
            <p className="page-in mt-4 line-clamp-3 text-sm text-paper/80 [animation-delay:160ms] sm:text-base">{m.blurb}</p>
            <div className="page-in mt-5 flex flex-wrap gap-2 [animation-delay:220ms]">
              {m.genres.slice(0, 4).map((g) => (
                <span key={g} className="rounded-full border border-white/15 bg-ink/60 px-3 py-1 text-xs md:backdrop-blur">
                  {g}
                </span>
              ))}
            </div>
            <div className="page-in mt-7 flex flex-wrap gap-3 [animation-delay:280ms]">
              <Link href={`/manga/${m.id}#chapters`} className="press rounded-full px-6 py-3 font-semibold text-ink shadow-[0_0_40px_-8px_var(--c)] transition hover:scale-105" style={{ background: m.color }}>
                ▶ Read now
              </Link>
              <Link href={`/manga/${m.id}`} className="press glass rounded-full px-6 py-3 font-semibold transition hover:bg-white/15">
                More info
              </Link>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`c${m.id}`}
            src={m.cover}
            alt={m.title}
            className="page-in hidden w-56 rotate-3 rounded-3xl shadow-2xl ring-1 ring-white/20 transition duration-700 hover:rotate-0 hover:scale-105 md:block lg:w-64"
          />
        </div>

        {/* controls */}
        <div className="relative flex items-center gap-3 px-6 pb-6 sm:px-10 md:px-14">
          <div className="flex flex-1 gap-2">
            {items.map((it, k) => (
              <button
                key={it.id}
                onClick={() => (setI(k), setTick((t) => t + 1))}
                className="group relative h-6 flex-1"
                aria-label={`Show ${it.title}`}
                aria-current={k === i}
              >
                <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/15 transition group-hover:bg-white/30">
                  <span
                    key={k === i ? `${tick}-${i}` : "idle"}
                    className="block h-full rounded-full bg-paper"
                    style={
                      k < i
                        ? { width: "100%" }
                        : k === i
                          ? { animation: `fill ${DURATION}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }
                          : { width: 0 }
                    }
                  />
                </span>
              </button>
            ))}
          </div>
          <button onClick={() => go(-1)} className="press grid h-11 w-11 place-items-center rounded-full glass hover:bg-white/15" aria-label="Previous">
            ←
          </button>
          <button onClick={() => go(1)} className="press grid h-11 w-11 place-items-center rounded-full glass hover:bg-white/15" aria-label="Next">
            →
          </button>
        </div>
      </div>
    </section>
  );
}

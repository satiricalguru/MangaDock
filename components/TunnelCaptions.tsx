"use client";

import { useEffect, useRef } from "react";

const CAPTIONS = [
  { a: "Thousands of worlds.", b: "One scroll away." },
  { a: "Manga. Manhwa. Manhua.", b: "All in full colour." },
  { a: "Pick up where you left off,", b: "down to the page." },
];

/** Tall sticky section: captions take turns while the WebGL camera flies through the covers. */
export default function TunnelCaptions() {
  const section = useRef<HTMLElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = section.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        const p = Math.min(Math.max(-r.top / total, 0), 1) * CAPTIONS.length;
        items.current.forEach((node, i) => {
          if (!node) return;
          const local = p - i; // 0..1 while this caption is on stage
          const visible = Math.max(0, 1 - Math.abs(local - 0.5) * 2.6);
          node.style.opacity = String(Math.min(visible * 1.6, 1));
          node.style.transform = `translateY(${(0.5 - local) * 120}px) scale(${0.92 + visible * 0.08})`;
          node.style.filter = `blur(${(1 - visible) * 8}px)`;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section ref={section} className="relative z-10 h-[260vh] md:h-[340vh]" aria-label="Dive in">
      <div className="sticky top-0 grid h-dvh place-items-center px-6">
        {CAPTIONS.map((c, i) => (
          <div
            key={i}
            ref={(n) => {
              items.current[i] = n;
            }}
            className="col-start-1 row-start-1 max-w-4xl text-center font-display text-[clamp(2rem,6.5vw,5.5rem)] font-black italic leading-[0.95] opacity-0 will-change-transform"
          >
            {c.a}
            <br />
            <span className="text-neon">{c.b}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

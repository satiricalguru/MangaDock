"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Phones and tablets: the WebGL scene (and even the video) can run iOS WebKit out of memory. */
function isHandheld() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return (
    ios ||
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 900px)").matches ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 4)
  );
}

/**
 * Fixed full-screen background for the homepage.
 * WebGL scene on capable desktops; the looping video on weak desktops;
 * on phones and tablets a slowly drifting poster with floating rows of covers (CSS only);
 * a still poster with reduced motion or Save-Data on.
 */
export default function HeroBackground({ covers }: { covers: string[] }) {
  const [mode, setMode] = useState<"pending" | "webgl" | "video" | "still" | "static">("pending");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    // phones and tablets get the still poster for now; the video comes back once they're confirmed stable
    if (reduced || saveData) return setMode("static");
    if (isHandheld()) return setMode("still");
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 2;
    setMode(!lowPower && webglAvailable() ? "webgl" : "video");
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-0" aria-hidden>
      {mode === "webgl" ? (
        <Scene covers={covers} />
      ) : mode === "video" ? (
        <video className="h-full w-full object-cover brightness-[0.55]" autoPlay muted loop playsInline poster="/media/hero-poster.jpg">
          <source src="/media/hero.webm" type="video/webm" />
          <source src="/media/hero.mp4" type="video/mp4" />
        </video>
      ) : (
        <div className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/hero-poster.jpg" alt="" className={`h-full w-full object-cover ${mode === "still" ? "kenburns" : ""}`} />
          {/* dimmed with an overlay rather than a filter, which is cheaper on phones */}
          <div className="absolute inset-0 bg-black/50" />
          {mode === "still" && covers.length > 0 && <CoverDrift covers={covers} />}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-transparent to-ink/80" />
    </div>
  );
}

/** Two tilted rows of trending covers sliding in opposite directions. Each row is one
 *  transformed layer, and the covers are AniList's ~230px art, so it stays light. */
function CoverDrift({ covers }: { covers: string[] }) {
  const half = Math.ceil(covers.length / 2);
  const rows = [covers.slice(0, half), covers.slice(half)].filter((r) => r.length);
  return (
    <div className="absolute inset-x-0 top-[14%] -rotate-[8deg] space-y-4 opacity-35">
      {rows.map((row, r) => (
        <div key={r} className={`flex w-max gap-4 ${r % 2 ? "drift-reverse -ml-24" : "drift"}`}>
          {[...row, ...row].map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" decoding="async" className="h-40 w-28 shrink-0 rounded-2xl object-cover ring-1 ring-white/15" />
          ))}
        </div>
      ))}
    </div>
  );
}

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

/** Phones and tablets get the plain video: the WebGL scene can run iOS WebKit out of memory. */
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
 * WebGL scene on capable desktops; the looping video on phones, tablets and weak machines;
 * a still poster when the visitor prefers reduced motion or has Save-Data on.
 */
export default function HeroBackground({ covers }: { covers: string[] }) {
  const [mode, setMode] = useState<"pending" | "webgl" | "video" | "still">("pending");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 2 || isHandheld();
    setMode(reduced || saveData ? "still" : !lowPower && webglAvailable() ? "webgl" : "video");
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
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/media/hero-poster.jpg" alt="" className="h-full w-full object-cover brightness-[0.5]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-transparent to-ink/80" />
    </div>
  );
}

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

/**
 * Fixed full-screen background for the homepage.
 * WebGL scene when the device can handle it; the looping video otherwise;
 * a still poster when the visitor prefers reduced motion.
 */
export default function HeroBackground({ covers }: { covers: string[] }) {
  const [mode, setMode] = useState<"pending" | "webgl" | "video" | "still">("pending");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 2;
    setMode(reduced ? "still" : webglAvailable() && !lowPower ? "webgl" : "video");
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

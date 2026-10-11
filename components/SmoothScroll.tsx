"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { pointer, scrollState } from "@/lib/scroll";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) document.documentElement.classList.add("reduced");

    const lenis = new Lenis({ duration: 1.15, smoothWheel: !reduced, autoResize: true });
    lenisRef.current = lenis;
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    const sync = () => {
      scrollState.y = lenis.scroll;
      scrollState.screens = lenis.scroll / window.innerHeight;
      scrollState.progress = lenis.limit ? lenis.scroll / lenis.limit : 0;
    };
    lenis.on("scroll", (l: Lenis) => {
      sync();
      scrollState.velocity += (l.velocity - scrollState.velocity) * 0.2;
      ScrollTrigger.update();
    });
    const tick = (time: number) => {
      lenis.raf(time * 1000);
      scrollState.velocity *= 0.92;
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // new page: start at the top and recalculate the scroll length
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (!window.location.hash) lenis.scrollTo(0, { immediate: true });
    requestAnimationFrame(() => lenis.resize());
    scrollState.y = scrollState.screens = scrollState.progress = 0;
  }, [pathname]);

  return null;
}

"use client";

import { useEffect } from "react";

const DESKTOP = "(min-width: 768px) and (pointer: fine)";

/**
 * Scroll-reveal for phones, tablets and browsers without CSS scroll timelines.
 * (Capable desktops use the scroll-driven animation in globals.css instead.)
 *
 * Each [data-reveal] element gets a data-shown attribute as it enters the viewport,
 * which plays a one-shot CSS transition. Unlike a scroll timeline, a finished
 * transition leaves no animated layer behind, so phones only ever animate the
 * handful of elements on screen. Only an attribute React never renders is touched,
 * so re-renders can't hide anything again.
 */
export default function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    if (window.matchMedia(DESKTOP).matches && CSS.supports("animation-timeline: view()")) return;

    const show = (el: Element) => el.setAttribute("data-shown", "");
    const inView = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    };

    // An observer always reports once right after observe(). If it never does (a stalled or
    // throttled page), give up on the effect rather than leave content hidden.
    let alive = false;
    const io = new IntersectionObserver(
      (entries) => {
        alive = true;
        let i = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).style.transitionDelay = `${Math.min(i++ * 70, 350)}ms`;
          show(e.target);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.01 },
    );
    const watch = (el: Element) => !el.hasAttribute("data-shown") && io.observe(el);
    const scan = (node: ParentNode) => node.querySelectorAll("[data-reveal]").forEach(watch);

    // whatever is already on screen stays put, so nothing blinks out on load
    document.querySelectorAll("[data-reveal]").forEach((el) => inView(el) && show(el));
    root.classList.add("js-reveal");
    scan(document);

    // sections streamed in later, and client-side navigation
    const mo = new MutationObserver((muts) => {
      for (const m of muts)
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches("[data-reveal]")) watch(n);
          scan(n);
        });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    const failsafe = setTimeout(() => {
      if (alive) return;
      io.disconnect();
      mo.disconnect();
      root.classList.remove("js-reveal");
    }, 2500);
    return () => {
      clearTimeout(failsafe);
      io.disconnect();
      mo.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);
  return null;
}

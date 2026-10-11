"use client";

import { useEffect } from "react";

/**
 * Fades every [data-reveal] element in as it scrolls into view.
 * A MutationObserver picks up elements added later (client-side navigation,
 * streamed sections), so nothing is ever left invisible.
 */
export default function Reveal() {
  useEffect(() => {
    const show = (el: Element) => el.classList.add("is-in");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      document.documentElement.classList.add("reduced");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        let i = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.style.transitionDelay = `${Math.min(i++ * 60, 360)}ms`;
          show(el);
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const scan = (root: ParentNode) => root.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
    scan(document);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n instanceof Element && (n.matches("[data-reveal]") ? io.observe(n) : scan(n)));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}

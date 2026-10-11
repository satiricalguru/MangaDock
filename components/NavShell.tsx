"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { scrollState } from "@/lib/scroll";

/**
 * Client behaviour for the server-rendered nav: hides while scrolling down and
 * comes back on scroll up, shows reading progress, and gets out of the way in the reader.
 */
export function NavShell({ header, tabbar }: { header: React.ReactNode; tabbar: React.ReactNode }) {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const reader = pathname.startsWith("/read/");

  useEffect(() => {
    let last = 0;
    let raf = 0;
    const tick = () => {
      const y = scrollState.y || window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 240);
        last = y;
      }
      setScrolled(y > 24);
      setProgress(max > 0 ? Math.min(y / max, 1) : 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => setHidden(false), [pathname]);

  if (reader) return null; // the reader has its own toolbar

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[55] h-[3px]" aria-hidden>
        <div className="h-full origin-left bg-gradient-to-r from-magenta via-lavender to-cyan" style={{ transform: `scaleX(${progress})` }} />
      </div>
      <header
        className={`fixed inset-x-0 top-0 z-50 px-3 pt-3 transition-[transform,opacity] duration-500 ease-glide sm:px-6 sm:pt-4 ${hidden ? "-translate-y-24 opacity-0" : ""} ${scrolled ? "[&_nav]:shadow-[0_10px_40px_-12px_#000]" : ""}`}
      >
        {header}
      </header>
      <div className={`transition-transform duration-500 ease-glide lg:hidden ${hidden ? "translate-y-24" : ""}`}>{tabbar}</div>
    </>
  );
}

export function NavLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const [path, query] = href.split("?");
  // query-specific links (Manhwa, Top rated) only light up from the nav itself, so Browse owns /browse
  const active = query ? false : path === "/" ? pathname === "/" : pathname.startsWith(path);
  return (
    <Link href={href} prefetch={href === "/random" ? false : undefined} aria-current={active ? "page" : undefined} className={`${className} ${active ? "is-active" : ""}`}>
      {children}
    </Link>
  );
}

"use client";

import { useRef } from "react";

/** Wraps children in a card that tilts toward the pointer and casts a neon glow. */
export default function TiltCard({ children, className = "", glow = "#ff2e95" }: { children: React.ReactNode; className?: string; glow?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(800px) rotateX(${-y * 12}deg) rotateY(${x * 14}deg) translateZ(0)`;
    el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ ["--glow" as string]: glow }}
      className={`group relative transition-transform duration-500 ease-glide will-change-transform ${className}`}
    >
      <div className="pointer-events-none absolute -inset-1 rounded-[22px] opacity-0 blur-xl transition duration-500 group-hover:opacity-70" style={{ background: "var(--glow)" }} />
      <div className="relative overflow-hidden rounded-[18px]">
        {children}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition duration-300 group-hover:opacity-100"
          style={{ background: "radial-gradient(circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,.55), transparent 55%)" }}
        />
      </div>
    </div>
  );
}

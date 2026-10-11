"use client";

import { useState } from "react";

/** Long text that starts clamped, with a "Read more" toggle. */
export default function Expandable({ text, lines = 5 }: { text: string; lines?: number }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 420;
  return (
    <div className="mt-8 max-w-3xl">
      <p
        className="whitespace-pre-line leading-relaxed text-paper/85 transition-all"
        style={!open && long ? { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
      >
        {text}
      </p>
      {long && (
        <button onClick={() => setOpen((o) => !o)} className="press mt-2 text-sm font-semibold text-lavender hover:text-white" aria-expanded={open}>
          {open ? "Show less ↑" : "Read more ↓"}
        </button>
      )}
    </div>
  );
}

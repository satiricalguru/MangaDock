"use client";

export default function SearchButton({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event("ni:search"))} className={className} aria-label="Search">
      {children}
    </button>
  );
}

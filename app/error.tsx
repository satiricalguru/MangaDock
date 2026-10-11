"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="speedlines flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-5xl font-black italic sm:text-7xl">
        Plot <span className="text-neon">twist.</span>
      </p>
      <p className="mt-4 max-w-md text-mist">One of our data sources didn&apos;t answer in time. This is usually temporary.</p>
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="rounded-full bg-magenta px-6 py-3 font-semibold hover:bg-white hover:text-ink">
          Try again
        </button>
        <Link href="/" className="rounded-full glass px-6 py-3 font-semibold hover:bg-white/15">
          Home
        </Link>
      </div>
    </div>
  );
}

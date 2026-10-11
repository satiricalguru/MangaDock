import Link from "next/link";
import MangaCard from "./MangaCard";
import type { Media } from "@/lib/anilist";
import { RAIL_PAD } from "@/lib/ui";

export default function Rail({ title, kicker, items, href }: { title: string; kicker?: string; items: Media[]; href?: string }) {
  if (items.length === 0) return null;
  return (
    <section className="relative z-10 py-12">
      <div className="mx-auto flex max-w-7xl items-end gap-4 px-6" data-reveal>
        <div>
          {kicker && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-magenta">{kicker}</p>}
          <h2 className="mt-2 font-display text-3xl font-black italic sm:text-4xl">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="press group ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-white/20 px-4 py-2 text-sm transition hover:border-magenta hover:bg-magenta hover:text-white">
            See all <span className="transition group-hover:translate-x-0.5">→</span>
          </Link>
        )}
      </div>
      <div className="scrollbar-none mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6 sm:gap-5" style={RAIL_PAD}>
        {items.map((m) => (
          <MangaCard key={m.id} m={m} className="w-36 shrink-0 snap-start sm:w-48" />
        ))}
      </div>
    </section>
  );
}

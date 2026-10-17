import Link from "next/link";
import TiltCard from "./TiltCard";
import { COUNTRY_LABEL, displayTitle, type Media } from "@/lib/anilist";

export default function MangaCard({ m, rank, className = "" }: { m: Media; rank?: number; className?: string }) {
  const color = m.coverImage.color ?? "#ff2e95";
  return (
    <Link href={m.href ?? `/manga/${m.id}`} className={`block ${className}`} data-reveal suppressHydrationWarning>
      <TiltCard glow={color}>
        <div className="relative aspect-[2/3] bg-ink-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.coverImage.large} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 ease-glide group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
          {rank != null && (
            <span className="absolute -bottom-3 left-2 font-display text-7xl font-black italic leading-none text-transparent [-webkit-text-stroke:2px_white]">
              {rank}
            </span>
          )}
          <div className="absolute left-2 top-2 flex gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
            <span className="rounded-full bg-ink/80 px-2 py-1 md:backdrop-blur">{COUNTRY_LABEL[m.countryOfOrigin ?? "JP"] ?? "Manga"}</span>
            {m.averageScore ? <span className="rounded-full px-2 py-1 text-ink" style={{ background: color }}>★ {m.averageScore / 10}</span> : null}
          </div>
          {m.readable && (
            <span className="absolute bottom-2 right-2 rounded-full bg-lime px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink" title="English chapters available here">
              Read
            </span>
          )}
        </div>
      </TiltCard>
      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-snug">{displayTitle(m)}</p>
      <p className="mt-1 truncate text-xs text-mist">{m.genres.slice(0, 3).join(" · ")}</p>
    </Link>
  );
}

import Link from "next/link";
import HeroBackground from "@/components/hero/HeroBackground";
import MangaCard from "@/components/MangaCard";
import Rail from "@/components/Rail";
import TunnelCaptions from "@/components/TunnelCaptions";
import ContinueRail from "@/components/ContinueRail";
import { COUNTRY_LABEL, displayTitle, listMany, plainText, type Media } from "@/lib/anilist";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import { proxied } from "@/lib/img";

// Rendered per request; the shared API cache keeps it fast and stops a failed
// fetch from being frozen into a static page.
export const dynamic = "force-dynamic";

const GENRES: { name: string; from: string; to: string; jp: string }[] = [
  { name: "Action", from: "#ff2e95", to: "#ffac2e", jp: "アクション" },
  { name: "Romance", from: "#ff7ac8", to: "#ab77ff", jp: "恋愛" },
  { name: "Fantasy", from: "#6120ee", to: "#99ecff", jp: "ファンタジー" },
  { name: "Comedy", from: "#d4ff3a", to: "#ffac2e", jp: "コメディ" },
  { name: "Drama", from: "#ab77ff", to: "#ff2e95", jp: "ドラマ" },
  { name: "Sci-Fi", from: "#99ecff", to: "#6120ee", jp: "SF" },
  { name: "Slice of Life", from: "#a0e0ab", to: "#99ecff", jp: "日常" },
  { name: "Horror", from: "#a52d25", to: "#6120ee", jp: "ホラー" },
  { name: "Mystery", from: "#4a17b0", to: "#ff2e95", jp: "ミステリー" },
  { name: "Sports", from: "#ffac2e", to: "#d4ff3a", jp: "スポーツ" },
  { name: "Supernatural", from: "#6120ee", to: "#ff2e95", jp: "超常" },
  { name: "Psychological", from: "#1e1433", to: "#ab77ff", jp: "心理" },
];

const PARTNERS = ["WEBTOON", "Anime-Planet", "MANGA Plus", "VIZ", "K MANGA", "Tapas", "Tappytoon", "Kakao Page", "Lezhin", "Yen Press", "Seven Seas", "MangaDex", "AniList", "MyAnimeList"];

const FEATURES = [
  { icon: "↺", color: "#ff2e95", title: "Resume to the page", text: "Close the tab mid-chapter. Come back tomorrow on your phone and you land on the exact page." },
  { icon: "⇅", color: "#99ecff", title: "Strip or paged", text: "Scroll webtoons in one long strip, or flip manga page by page with taps and arrow keys." },
  { icon: "★", color: "#d4ff3a", title: "Your shelf", text: "Reading, plan to read, completed, favourites. Read chapters get ticked off automatically." },
  { icon: "⚡", color: "#ffac2e", title: "Data saver", text: "Compressed pages for slow connections, one tap away in the reader." },
];

async function loadHome() {
  const empty = { trending: [], manhwa: [], releasing: [], manhua: [], topRated: [], completed: [], romance: [], action: [], rising: [] };
  const [a, b] = await Promise.all([
    listMany({
      trending: { sort: "TRENDING_DESC", perPage: 20, full: true },
      manhwa: { sort: "TRENDING_DESC", country: "KR", perPage: 16 },
      releasing: { sort: "POPULARITY_DESC", country: "JP", status: "RELEASING", perPage: 16 },
      manhua: { sort: "TRENDING_DESC", country: "CN", perPage: 16 },
      rising: { sort: "TRENDING_DESC", status: "RELEASING", page: 2, perPage: 16 },
    }).catch(() => null),
    listMany({
      topRated: { sort: "SCORE_DESC", perPage: 16 },
      completed: { sort: "POPULARITY_DESC", status: "FINISHED", perPage: 16 },
      romance: { sort: "TRENDING_DESC", genre: "Romance", perPage: 16 },
      action: { sort: "TRENDING_DESC", genre: "Action", perPage: 16 },
    }).catch(() => null),
  ]);
  return { ...empty, ...(a ?? {}), ...(b ?? {}), failed: !a && !b } as Record<keyof typeof empty, Media[]> & { failed: boolean };
}

export default async function Home() {
  const d = await loadHome();
  const covers = d.trending.slice(0, 12).map((m) => proxied(m.coverImage.large));

  return (
    <>
      <HeroBackground covers={covers} />

      {/* HERO */}
      <section className="relative z-10 flex min-h-dvh flex-col justify-end px-6 pb-24 pt-32 lg:pb-16">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-ink via-ink/60 to-transparent md:h-1/2 md:from-ink/70" aria-hidden />
        <div className="relative mx-auto w-full max-w-7xl">
          <p className="glass page-in mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] sm:text-xs">
            <span className="h-2 w-2 animate-pulse rounded-full bg-lime" /> Free · No ads · Read online
          </p>
          <h1 className="page-in font-display text-[clamp(3.2rem,11vw,10rem)] font-black italic leading-[0.85] tracking-tight [animation-delay:120ms]">
            Every panel
            <br />
            <span className="text-neon">in full colour.</span>
          </h1>
          <div className="page-in mt-8 flex flex-wrap items-center gap-3 [animation-delay:260ms] sm:gap-4">
            <Link href="/browse" className="press rounded-full bg-magenta px-7 py-3.5 font-semibold shadow-[0_0_40px_-5px_#ff2e95] transition hover:scale-105 hover:bg-white hover:text-ink">
              Start reading
            </Link>
            <Link href="#trending" className="press glass rounded-full px-7 py-3.5 font-semibold transition hover:bg-white/15">
              What&apos;s trending
            </Link>
            <p className="max-w-sm text-sm text-mist">Manga, manhwa and manhua from AniList, MyAnimeList and MangaDex, in one place.</p>
          </div>
        </div>
        <div className="absolute bottom-8 right-8 hidden h-24 w-24 animate-[spin_14s_linear_infinite] md:block" aria-hidden>
          <svg viewBox="0 0 100 100" className="h-full w-full fill-paper/80 text-[11px] font-semibold tracking-[0.3em]">
            <defs>
              <path id="circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
            </defs>
            <text>
              <textPath href="#circle">SCROLL TO DIVE · SCROLL TO DIVE ·</textPath>
            </text>
          </svg>
        </div>
      </section>

      <TunnelCaptions />

      {d.failed && (
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
          <div className="glass rounded-3xl p-6 text-center">
            <p className="font-semibold">AniList isn&apos;t answering right now, so the shelves below are empty.</p>
            <a href="/" className="mt-4 inline-block rounded-full bg-magenta px-5 py-2.5 text-sm font-semibold">
              Reload
            </a>
          </div>
        </div>
      )}

      <ContinueRail />

      {/* FEATURED */}
      <FeaturedCarousel
        items={d.trending.slice(0, 6).map((m) => ({
          id: m.id,
          title: displayTitle(m),
          banner: m.bannerImage ?? m.coverImage.extraLarge,
          cover: m.coverImage.extraLarge,
          color: m.coverImage.color ?? "#ff2e95",
          blurb: plainText(m.description, 300),
          genres: m.genres,
          score: m.averageScore,
          kind: COUNTRY_LABEL[m.countryOfOrigin ?? "JP"] ?? "Manga",
        }))}
      />

      {/* TRENDING TOP 10 */}
      {d.trending.length > 0 && (
        <section id="trending" className="relative z-10 scroll-mt-24 px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <div data-reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan">This week</p>
              <h2 className="mt-2 font-display text-4xl font-black italic sm:text-6xl">Trending top 10</h2>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
              {d.trending.slice(0, 10).map((m, i) => (
                <MangaCard key={m.id} m={m} rank={i + 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GENRES */}
      <section className="relative z-10 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-4xl font-black italic sm:text-6xl" data-reveal>
            Pick your <span className="text-neon">vibe</span>
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {GENRES.map((g) => (
              <Link
                key={g.name}
                href={`/browse?genre=${encodeURIComponent(g.name)}`}
                data-reveal
                className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-3xl p-5 transition duration-500 ease-glide hover:-translate-y-2 hover:rotate-[-1.5deg]"
                style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
              >
                <span className="speedlines absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100" />
                <span className="halftone absolute inset-0 opacity-40 mix-blend-overlay" />
                <span className="absolute right-3 top-2 font-display text-2xl font-black text-white/25 transition group-hover:scale-110">{g.jp}</span>
                <span className="relative font-display text-lg font-black italic text-ink">{g.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="relative z-10 bg-gradient-to-b from-transparent via-ink/70 to-ink">
        <Rail kicker="Korea" title="Hot manhwa" items={d.manhwa} href="/browse?country=KR" />
        <Rail kicker="Japan" title="Ongoing manga" items={d.releasing} href="/browse?country=JP&status=RELEASING" />
        <Rail kicker="China" title="Manhua on the rise" items={d.manhua} href="/browse?country=CN" />
      </div>

      {/* READER FEATURES */}
      <section className="relative z-10 overflow-hidden bg-ink px-6 py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-violet/30 blur-[160px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-2xl" data-reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-magenta">Made for bingeing</p>
            <h2 className="mt-2 font-display text-4xl font-black italic sm:text-6xl">
              A reader that <span className="text-neon">remembers.</span>
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass group rounded-[28px] p-7 transition duration-500 ease-glide hover:-translate-y-2" data-reveal>
                <span className="grid h-14 w-14 place-items-center rounded-2xl text-2xl text-ink transition group-hover:rotate-[-8deg] group-hover:scale-110" style={{ background: f.color }}>
                  {f.icon}
                </span>
                <h3 className="mt-6 font-display text-xl font-black italic">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3" data-reveal>
            <Link href="/login?mode=signup" className="rounded-full bg-paper px-6 py-3 font-semibold text-ink transition hover:bg-lime">
              Create a free account
            </Link>
            <Link href="/library" className="glass rounded-full px-6 py-3 font-semibold transition hover:bg-white/15">
              Open my shelf
            </Link>
          </div>
        </div>
      </section>

      <div className="relative z-10 bg-ink">
        <Rail kicker="Fresh chapters" title="Rising this season" items={d.rising} href="/browse?status=RELEASING" />
        <Rail kicker="All time" title="Highest rated" items={d.topRated} href="/browse?sort=SCORE_DESC" />
        <Rail kicker="Heart eyes" title="Romance picks" items={d.romance} href="/browse?genre=Romance" />
        <Rail kicker="Adrenaline" title="Action that hits" items={d.action} href="/browse?genre=Action" />
        <Rail kicker="Binge it all" title="Completed series" items={d.completed} href="/browse?status=FINISHED&sort=POPULARITY_DESC" />
      </div>

      {/* SURPRISE */}
      <section className="relative z-10 overflow-hidden bg-ink px-6 py-24">
        <Link
          href="/random"
          prefetch={false}
          className="speedlines group relative mx-auto flex max-w-7xl flex-col items-center overflow-hidden rounded-[40px] px-6 py-20 text-center"
          style={{ background: "linear-gradient(120deg, #ff2e95, #6120ee 45%, #99ecff)" }}
          data-reveal
        >
          <span className="halftone absolute inset-0 opacity-50 mix-blend-overlay" />
          <span className="relative text-6xl transition duration-700 ease-glide group-hover:rotate-[360deg]">🎲</span>
          <span className="relative mt-6 font-display text-4xl font-black italic text-white sm:text-7xl">Can&apos;t decide?</span>
          <span className="relative mt-4 rounded-full bg-ink px-7 py-3.5 font-semibold transition group-hover:bg-lime group-hover:text-ink">Surprise me with a random series</span>
        </Link>
      </section>

      {/* WHERE TO READ */}
      <section className="relative z-10 overflow-hidden bg-ink py-20">
        <div className="mx-auto max-w-7xl px-6" data-reveal>
          <h2 className="font-display text-4xl font-black italic sm:text-5xl">Built on the shoulders of giants</h2>
          <p className="mt-3 max-w-2xl text-mist">
            Our catalog comes from open community databases, and chapters are credited to the people who translate them. When a series is licensed, we
            point you to the official platform.
          </p>
          <Link href="/credits" className="mt-6 inline-block rounded-full border border-white/20 px-5 py-2.5 text-sm transition hover:border-lime hover:text-lime">
            See every source →
          </Link>
        </div>
        <div className="marquee mt-12 flex w-max gap-4" aria-hidden>
          {[...PARTNERS, ...PARTNERS].map((p, i) => (
            <span key={i} className="rounded-full border border-white/10 px-6 py-3 font-display text-lg font-black italic text-white/70 odd:text-magenta">
              {p}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}

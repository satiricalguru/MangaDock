export const metadata = { title: "Credits & sources" };

const SECTIONS: { title: string; blurb: string; items: { name: string; url: string; role: string }[] }[] = [
  {
    title: "Data",
    blurb: "Where the catalog, scores and chapters come from.",
    items: [
      { name: "AniList", url: "https://anilist.co", role: "Catalog: titles, covers, banners, genres, trending and recommendations (GraphQL API)" },
      { name: "MyAnimeList", url: "https://myanimelist.net", role: "Scores and rankings, via the Jikan API" },
      { name: "Jikan", url: "https://jikan.moe", role: "Open-source MyAnimeList API" },
      { name: "MangaDex", url: "https://mangadex.org", role: "Chapter listings and the in-site reader (MangaDex@Home)" },
      { name: "Scanlation groups", url: "https://mangadex.org/groups", role: "The volunteers who translate chapters. Each one is credited on its chapter." },
    ],
  },
  {
    title: "Read legally",
    blurb: "Official platforms we link to, and the sites that inspired this one. Please support creators there.",
    items: [
      { name: "WEBTOON", url: "https://www.webtoons.com/en/", role: "Official webcomics and Originals" },
      { name: "Anime-Planet", url: "https://www.anime-planet.com/manga/read-online/", role: "Legal free reading through industry partners" },
      { name: "MANGA Plus by Shueisha", url: "https://mangaplus.shueisha.co.jp", role: "Official Shonen Jump simulpubs" },
      { name: "VIZ", url: "https://www.viz.com", role: "Official English manga" },
      { name: "K MANGA", url: "https://kmanga.kodansha.com", role: "Official Kodansha manga" },
      { name: "Tapas", url: "https://tapas.io", role: "Official webcomics and novels" },
      { name: "Tappytoon", url: "https://www.tappytoon.com", role: "Official manhwa" },
      { name: "Kakao Page", url: "https://page.kakao.com", role: "Official Korean webtoons" },
      { name: "Lezhin", url: "https://www.lezhinus.com", role: "Official manhwa" },
    ],
  },
  {
    title: "Design",
    blurb: "Visual references and tools.",
    items: [
      { name: "Dribbble anime community", url: "https://dribbble.com/search/anime", role: "UI references, including the Animfanz homepage concept" },
      { name: "Refero Styles", url: "https://styles.refero.design", role: "Design system references: monopo saigon, fal.ai, Playful" },
      { name: "Google Gemini", url: "https://gemini.google.com", role: "Generated the hero background video" },
      { name: "Three.js, React Three Fiber, GSAP, Lenis", url: "https://threejs.org", role: "WebGL scene and scroll animation" },
    ],
  },
];

export default function Credits() {
  return (
    <div className="relative overflow-hidden px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute -right-40 -top-20 h-[520px] w-[520px] rounded-full bg-violet/40 blur-[140px]" />
      <div className="relative mx-auto max-w-5xl">
        <h1 className="font-display text-5xl font-black italic sm:text-7xl">
          Credits <span className="text-neon">&amp; sources</span>
        </h1>
        <p className="mt-4 max-w-2xl text-mist">
          Neon Ink is free and ad-free. It hosts no files: everything here is pulled from these communities and platforms, with credit.
        </p>
        {SECTIONS.map((s) => (
          <section key={s.title} className="mt-16" data-reveal>
            <h2 className="font-display text-2xl font-black italic">{s.title}</h2>
            <p className="mt-1 text-sm text-mist">{s.blurb}</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {s.items.map((it) => (
                <li key={it.name}>
                  <a href={it.url} target="_blank" rel="noreferrer" className="glass block h-full rounded-3xl p-5 transition hover:-translate-y-1 hover:border-magenta/60">
                    <p className="font-semibold">{it.name} ↗</p>
                    <p className="mt-1 text-sm text-mist">{it.role}</p>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section className="mt-16 rounded-3xl border border-white/10 p-6 text-sm text-mist" data-reveal>
          <p className="font-semibold text-paper">Takedowns</p>
          <p className="mt-2">
            Scanlation group leaders and rights holders can ask for a chapter to be removed. We follow MangaDex&apos;s policy and honour every request.
          </p>
        </section>
      </div>
    </div>
  );
}

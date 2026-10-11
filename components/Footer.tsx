import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-ink px-6 py-14 text-sm text-mist">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-black italic text-paper">
            NEON<span className="text-neon">INK</span>
          </p>
          <p className="mt-3 max-w-xs">A free, ad-free fan site for discovering and reading manga, manhwa and manhua.</p>
        </div>
        <div>
          <p className="mb-3 font-semibold text-paper">Data from</p>
          <ul className="space-y-1.5">
            <li><a className="hover:text-white" href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a> (catalog)</li>
            <li><a className="hover:text-white" href="https://myanimelist.net" target="_blank" rel="noreferrer">MyAnimeList</a> via <a className="hover:text-white" href="https://jikan.moe" target="_blank" rel="noreferrer">Jikan</a> (scores)</li>
            <li><a className="hover:text-white" href="https://mangadex.org" target="_blank" rel="noreferrer">MangaDex</a> (reader) and its scanlation groups</li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold text-paper">Read legally</p>
          <ul className="space-y-1.5">
            <li><a className="hover:text-white" href="https://www.webtoons.com/en/" target="_blank" rel="noreferrer">WEBTOON</a></li>
            <li><a className="hover:text-white" href="https://www.anime-planet.com/manga/read-online/" target="_blank" rel="noreferrer">Anime-Planet</a></li>
            <li><Link className="text-magenta hover:text-white" href="/credits">All credits and sources →</Link></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-7xl text-xs text-mist/60">
        Neon Ink hosts no files. Chapters are served by MangaDex@Home and credited to their scanlation groups. Support the
        creators by reading on official platforms when a series is licensed.
      </p>
    </footer>
  );
}

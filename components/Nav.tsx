import Link from "next/link";
import type { User } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import SearchButton from "./SearchButton";
import { NavLink, NavShell } from "./NavShell";

const LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/browse?country=KR", label: "Manhwa" },
  { href: "/browse?sort=SCORE_DESC", label: "Top rated" },
  { href: "/library", label: "Library" },
];

function Avatar({ user, size = 36 }: { user: User; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-display text-sm font-black text-ink"
      style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${user.hue} 95% 65%), hsl(${(user.hue + 70) % 360} 95% 70%))` }}
    >
      {user.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function Nav({ user }: { user: User | null }) {
  const header = (
    <nav className="glass mx-auto flex max-w-7xl items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5 transition-shadow sm:pl-5">
      <Link href="/" className="group mr-1 flex items-center gap-1 font-display text-lg font-black italic tracking-tight" aria-label="MangaDock home">
        <span className="transition group-hover:-skew-x-12">MANGA</span>
        <span className="text-neon">DOCK</span>
      </Link>
      <div className="ml-auto hidden items-center gap-1 text-sm text-mist lg:flex">
        {LINKS.map((l) => (
          <NavLink
            key={l.href}
            href={l.href}
            className="relative rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white [&.is-active]:bg-white/10 [&.is-active]:text-white"
          >
            {l.label}
          </NavLink>
        ))}
        <NavLink href="/random" className="group rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
          <span className="inline-block transition duration-500 group-hover:rotate-[360deg]">🎲</span> Surprise me
        </NavLink>
      </div>
      <SearchButton className="press ml-auto flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm text-mist transition hover:bg-white/15 hover:text-white lg:ml-2">
        <span aria-hidden>⌕</span>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-white/15 px-1.5 text-[10px] sm:inline">⌘K</kbd>
      </SearchButton>
      {user ? (
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center rounded-full p-0.5 ring-magenta/60 transition hover:ring-2" aria-label="Account menu">
            <Avatar user={user} />
          </summary>
          <div className="glass absolute right-0 mt-3 w-56 origin-top-right rounded-3xl p-2 text-sm group-open:animate-[page-in_0.35s_var(--ease-glide)]">
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar user={user} size={32} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{user.name}</p>
                <p className="truncate text-xs text-mist">{user.email}</p>
              </div>
            </div>
            <Link href="/library" className="block rounded-2xl px-3 py-2.5 hover:bg-white/10">My library</Link>
            <Link href="/library?tab=history" className="block rounded-2xl px-3 py-2.5 hover:bg-white/10">Reading history</Link>
            <form action={logout}>
              <button className="w-full rounded-2xl px-3 py-2.5 text-left text-magenta hover:bg-white/10">Log out</button>
            </form>
          </div>
        </details>
      ) : (
        <Link href="/login" className="press flex h-10 items-center rounded-full bg-magenta px-4 text-sm font-semibold shadow-[0_0_24px_-6px_#ff2e95] transition hover:bg-white hover:text-ink">
          Log in
        </Link>
      )}
    </nav>
  );

  const tabs = [
    { href: "/", icon: "⌂", label: "Home" },
    { href: "/browse", icon: "▦", label: "Browse" },
    { href: "/random", icon: "🎲", label: "Random" },
    { href: "/library", icon: "★", label: "Library" },
    { href: user ? "/library?tab=history" : "/login", icon: user ? "↺" : "☺", label: user ? "History" : "Log in" },
  ];
  const tabbar = (
    <nav
      className="glass fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 grid grid-cols-5 rounded-full p-1.5 text-[11px] text-mist"
      aria-label="Main"
    >
      {tabs.map((t) => (
        <NavLink
          key={t.label}
          href={t.href}
          className="press flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full transition hover:text-white [&.is-active]:bg-white/10 [&.is-active]:text-white"
        >
          <span className="text-base leading-none">{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );

  return <NavShell header={header} tabbar={tabbar} />;
}

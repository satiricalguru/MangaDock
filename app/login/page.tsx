import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import AuthForm from "./AuthForm";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const { next = "/library", mode } = await searchParams;
  if (await getUser()) redirect(next.startsWith("/") ? next : "/library");

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 pb-32 pt-28 md:pb-16">
      <video className="absolute inset-0 h-full w-full object-cover brightness-[0.45]" autoPlay muted loop playsInline poster="/media/hero-poster.jpg" aria-hidden>
        <source src="/media/hero.webm" type="video/webm" />
        <source src="/media/hero.mp4" type="video/mp4" />
      </video>
      <div className="halftone absolute inset-0 opacity-40" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/60" aria-hidden />
      <div className="relative grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_auto]">
        <div className="hidden lg:block">
          <p className="font-display text-[clamp(3rem,7vw,6.5rem)] font-black italic leading-[0.9]">
            Your shelf,
            <br />
            <span className="text-neon">everywhere.</span>
          </p>
          <ul className="mt-10 space-y-4 text-lg text-paper/85">
            <li className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-magenta/20 text-magenta">↺</span> Resume any chapter on the exact page</li>
            <li className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-cyan/20 text-cyan">★</span> Build a library of favourites and plans</li>
            <li className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-lime/20 text-lime">✓</span> See which chapters you&apos;ve already read</li>
          </ul>
        </div>
        <div className="flex justify-center">
          <AuthForm next={next} initialMode={mode === "signup" ? "signup" : "login"} />
        </div>
      </div>
    </div>
  );
}

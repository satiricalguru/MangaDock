import Link from "next/link";
import { getUser } from "@/lib/auth";
import LibraryView from "./LibraryView";

export const metadata = { title: "My library" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string; welcome?: string }> }) {
  const [user, { tab, welcome }] = await Promise.all([getUser(), searchParams]);
  return (
    <div className="relative min-h-dvh overflow-hidden px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute hidden md:block -left-40 -top-32 h-[520px] w-[520px] rounded-full bg-magenta/25 blur-[140px]" />
      <div className="pointer-events-none absolute hidden md:block -right-40 top-60 h-[480px] w-[480px] rounded-full bg-cyan/20 blur-[140px]" />
      <div className="relative mx-auto max-w-7xl">
        {welcome && (
          <p className="mb-6 inline-block rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink">Welcome aboard, {user?.name}! Your shelf is ready.</p>
        )}
        <h1 className="font-display text-5xl font-black italic sm:text-7xl">
          {user ? (
            <>
              {user.name}&apos;s <span className="text-neon">shelf</span>
            </>
          ) : (
            <>
              Your <span className="text-neon">shelf</span>
            </>
          )}
        </h1>
        {!user && (
          <div className="glass mt-6 flex flex-wrap items-center gap-4 rounded-3xl p-5">
            <p className="basis-full text-sm text-mist sm:flex-1 sm:basis-auto">
              You&apos;re browsing as a guest, so this list is saved on this device only. Log in to keep it safe and use it on any device.
            </p>
            <Link href="/login?next=/library" className="press rounded-full bg-magenta px-5 py-2.5 text-sm font-semibold hover:bg-white hover:text-ink">
              Log in
            </Link>
            <Link href="/login?mode=signup&next=/library" className="rounded-full glass px-5 py-2.5 text-sm font-semibold hover:bg-white/15">
              Sign up
            </Link>
          </div>
        )}
        <LibraryView initialTab={tab ?? "continue"} />
      </div>
    </div>
  );
}

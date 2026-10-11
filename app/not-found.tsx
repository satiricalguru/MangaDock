import Link from "next/link";

export default function NotFound() {
  return (
    <div className="speedlines flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-[clamp(5rem,20vw,14rem)] font-black italic leading-none text-neon">404</p>
      <p className="mt-4 text-lg text-mist">This page got isekai&apos;d.</p>
      <Link href="/" className="mt-8 rounded-full bg-magenta px-6 py-3 font-semibold hover:bg-white hover:text-ink">
        Back home
      </Link>
    </div>
  );
}

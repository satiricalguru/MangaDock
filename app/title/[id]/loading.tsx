export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-[52vh] min-h-80 bg-gradient-to-b from-ink-3 to-ink" />
      <div className="relative mx-auto -mt-56 grid max-w-7xl gap-10 px-6 md:grid-cols-[280px_1fr]">
        <div className="aspect-[2/3] w-56 rounded-3xl bg-white/10 md:w-full" />
        <div className="space-y-4 pt-4 md:pt-36">
          <div className="h-4 w-48 rounded bg-white/10" />
          <div className="h-14 w-3/4 rounded-2xl bg-white/10" />
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-5/6 rounded bg-white/5" />
          <div className="h-4 w-2/3 rounded bg-white/5" />
        </div>
      </div>
    </div>
  );
}

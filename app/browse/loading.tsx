export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-32">
      <div className="h-16 w-2/3 shimmer rounded-3xl" />
      <div className="mt-8 flex gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-8 w-20 shimmer rounded-full" />
        ))}
      </div>
      <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] shimmer rounded-[18px]" style={{ animationDelay: `${i * 40}ms` }} />
            <div className="mt-3 h-3 w-4/5 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[2/3] w-full animate-pulse bg-line" />
      <div className="flex flex-col gap-1.5 border-t border-line pt-2">
        <div className="h-3 w-4/5 animate-pulse bg-line" />
        <div className="h-2.5 w-1/2 animate-pulse bg-line" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 18 }: { count?: number }) {
  return (
    <div
      className="grid gap-x-4 gap-y-10"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonRail({ count = 8 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden px-8 pb-2 2xl:px-16">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[170px] flex-shrink-0 lg:w-[190px]">
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-line ${className}`} />;
}

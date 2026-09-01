import { SkeletonGrid, SkeletonBlock } from "@/components/skeleton";

export default function BrowseLoading() {
  return (
    <main className="flex w-full flex-col gap-8 px-8 py-12 2xl:px-16">
      <header className="flex flex-col gap-6 border-b border-line pb-8">
        <SkeletonBlock className="h-8 w-32" />
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-[42px] w-28" />
          ))}
        </div>
      </header>
      <SkeletonGrid />
    </main>
  );
}

import { SkeletonBlock } from "@/components/skeleton";

export default function AnimeDetailLoading() {
  return (
    <main className="flex w-full flex-col">
      <SkeletonBlock className="h-64 w-full lg:h-80" />
      <div className="relative z-10 mx-auto -mt-16 flex w-full max-w-5xl flex-col gap-10 px-8 py-10 lg:-mt-20 2xl:px-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <SkeletonBlock className="aspect-[2/3] w-40 flex-shrink-0 lg:w-56" />
          <div className="flex flex-1 flex-col gap-5">
            <SkeletonBlock className="h-9 w-2/3" />
            <SkeletonBlock className="h-4 w-1/3" />
            <SkeletonBlock className="h-10 w-40" />
            <div className="flex flex-col gap-2">
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

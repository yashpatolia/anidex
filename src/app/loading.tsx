import { SkeletonBlock, SkeletonRail } from "@/components/skeleton";

export default function HomeLoading() {
  return (
    <main className="flex flex-col">
      <section className="mx-auto grid w-full max-w-[1400px] grid-cols-1 px-8 lg:grid-cols-[1fr_320px] lg:items-center lg:gap-16 2xl:px-16">
        <div className="flex flex-col justify-center gap-6 py-20 lg:py-32">
          <SkeletonBlock className="h-10 w-full max-w-md" />
          <SkeletonBlock className="h-10 w-3/4 max-w-md" />
          <SkeletonBlock className="mt-4 h-11 w-40" />
        </div>
        <div className="pb-20 lg:pb-0">
          <SkeletonBlock className="aspect-[2/3] w-[280px] lg:w-[320px]" />
        </div>
      </section>

      <div className="flex flex-col gap-6 border-t border-line py-6">
        <SkeletonBlock className="ml-8 h-3 w-32 2xl:ml-16" />
        <SkeletonRail />
      </div>
    </main>
  );
}

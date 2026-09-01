import { SkeletonGrid, SkeletonBlock } from "@/components/skeleton";

export default function ProfileLoading() {
  return (
    <main className="flex w-full flex-col gap-12 px-8 py-12 2xl:px-16">
      <header className="flex flex-col gap-6 border-b border-line pb-8">
        <SkeletonBlock className="h-8 w-56" />
        <div className="flex gap-8">
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
      </header>
      <div className="flex flex-col gap-5">
        <SkeletonBlock className="h-6 w-32" />
        <SkeletonGrid count={6} />
      </div>
    </main>
  );
}

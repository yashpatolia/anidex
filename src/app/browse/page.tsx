import { Suspense } from "react";
import type { Metadata } from "next";
import { BrowseFilters } from "@/components/browse-filters";
import { BrowseView } from "@/components/browse-view";
import { PageLoading } from "@/components/page-loading";

export const metadata: Metadata = {
  title: "Browse",
};

// No server-side data fetching at all anymore (see BrowseView's file
// comment) — this page is just a static shell around client components
// that fetch AniList directly. useSearchParams needs a Suspense boundary
// even on the client, hence the wrap.
export default function BrowsePage() {
  return (
    <main className="flex w-full flex-col gap-8 px-8 py-12 2xl:px-16">
      <header className="flex flex-col gap-6 border-b border-line pb-8">
        <h1 className="font-display text-3xl text-paper">Browse</h1>
        <Suspense fallback={null}>
          <BrowseFilters />
        </Suspense>
      </header>

      <Suspense fallback={<PageLoading />}>
        <BrowseView />
      </Suspense>
    </main>
  );
}

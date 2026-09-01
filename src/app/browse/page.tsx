import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { browseWithSearch } from "@/lib/browse";
import { getTrackedAnilistIds } from "@/lib/list-status";
import { AnimeCard } from "@/components/anime-card";
import { BrowseFilters } from "@/components/browse-filters";
import { PageLoading } from "@/components/page-loading";

export const metadata: Metadata = {
  title: "Browse",
};

type Params = Record<string, string | undefined>;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  return (
    <main className="flex w-full flex-col gap-8 px-8 py-12 2xl:px-16">
      <header className="flex flex-col gap-6 border-b border-line pb-8">
        <h1 className="font-display text-3xl text-paper">Browse</h1>
        <Suspense fallback={null}>
          <BrowseFilters />
        </Suspense>
      </header>

      {/* The header above has no data dependency, so it should never wait
          on AniList — only the results themselves suspend. The key forces
          a fresh suspense (and loading screen) per distinct query instead
          of silently keeping the previous page's results on screen while
          the new ones load. */}
      <Suspense key={JSON.stringify(params)} fallback={<PageLoading />}>
        <BrowseResults params={params} page={page} />
      </Suspense>
    </main>
  );
}

async function BrowseResults({ params, page }: { params: Params; page: number }) {
  const [session, { media, pageInfo }] = await Promise.all([
    auth(),
    browseWithSearch({
      search: params.search || undefined,
      genres: params.genre?.split(",").filter(Boolean),
      yearFrom: params.yearFrom ? Number(params.yearFrom) : undefined,
      yearTo: params.yearTo ? Number(params.yearTo) : undefined,
      formats: params.format?.split(",").filter(Boolean),
      statuses: params.status?.split(",").filter(Boolean),
      minScore: params.minScore ? Number(params.minScore) : undefined,
      sort: params.sort || undefined,
      page,
      perPage: 50,
    }),
  ]);
  const trackedIds = session?.user ? await getTrackedAnilistIds(session.user.id) : new Set<number>();

  function pageHref(targetPage: number) {
    const next = new URLSearchParams(params as Record<string, string>);
    next.set("page", String(targetPage));
    return `/browse?${next.toString()}`;
  }

  return (
    <>
      {media.length === 0 ? (
        <p className="py-16 text-center text-sm text-ash">
          Nothing matches those filters. Try loosening one.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-10">
          {media.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} initialTracked={trackedIds.has(anime.id)} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-6 font-mono text-xs uppercase tracking-widest text-ash">
        {page > 1 ? (
          <Link href={pageHref(page - 1)} className="transition-colors hover:text-paper">
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        <span>Page {pageInfo.currentPage}</span>
        {pageInfo.hasNextPage ? (
          <Link href={pageHref(page + 1)} className="transition-colors hover:text-paper">
            Next →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </>
  );
}

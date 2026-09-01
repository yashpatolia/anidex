import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getSeasonalAnime, getCurrentSeason, SEASONS } from "@/lib/anilist";
import { getTrackedAnilistIds } from "@/lib/list-status";
import { AnimeCard } from "@/components/anime-card";
import { SeasonalSwitcher } from "@/components/seasonal-switcher";
import { SkeletonGrid } from "@/components/skeleton";

export const metadata: Metadata = {
  title: "Seasonal",
};

export default async function SeasonalPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; year?: string; page?: string }>;
}) {
  const params = await searchParams;
  const current = getCurrentSeason();
  const season = params.season || current.season;
  const year = params.year ? Number(params.year) : current.year;
  const page = Number(params.page ?? "1") || 1;
  const seasonLabel = SEASONS.find((s) => s.value === season)?.label ?? season;

  return (
    <main className="flex w-full flex-col gap-8 px-8 py-12 2xl:px-16">
      <header className="flex flex-col gap-6 border-b border-line pb-8">
        <h1 className="font-display text-3xl text-paper">
          {seasonLabel} {year}
        </h1>
        <SeasonalSwitcher season={season} year={year} />
      </header>

      {/* Header above has no data dependency — only the results suspend.
          Keyed per season/year/page so switching seasons always shows the
          skeleton for the new query instead of the previous season's grid
          hanging around while the new one loads. */}
      <Suspense key={`${season}-${year}-${page}`} fallback={<SkeletonGrid />}>
        <SeasonalResults season={season} year={year} page={page} />
      </Suspense>
    </main>
  );
}

async function SeasonalResults({ season, year, page }: { season: string; year: number; page: number }) {
  const [session, { media, pageInfo }] = await Promise.all([
    auth(),
    getSeasonalAnime(season, year, page, 30),
  ]);
  const trackedIds = session?.user ? await getTrackedAnilistIds(session.user.id) : new Set<number>();

  function pageHref(targetPage: number) {
    return `/seasonal?season=${season}&year=${year}&page=${targetPage}`;
  }

  return (
    <>
      {media.length === 0 ? (
        <p className="py-16 text-center text-sm text-ash">Nothing found for this season.</p>
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

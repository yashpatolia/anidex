"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSeasonalAnime, type AnilistMedia } from "@/lib/anilist-client";
import { useTrackedIds } from "@/lib/use-tracked-ids";
import { AnimeCard } from "@/components/anime-card";
import { PageLoading } from "@/components/page-loading";

type PageInfo = { currentPage: number; hasNextPage: boolean };

// Outer/inner split for the same reason as BrowseView: remounting a fresh
// SeasonalResults per distinct season/year/page (via the key below) avoids
// resetting state synchronously inside an effect.
export function SeasonalView({ season, year, page }: { season: string; year: number; page: number }) {
  return <SeasonalResults key={`${season}-${year}-${page}`} season={season} year={year} page={page} />;
}

function SeasonalResults({ season, year, page }: { season: string; year: number; page: number }) {
  const trackedIds = useTrackedIds();
  const [media, setMedia] = useState<AnilistMedia[] | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSeasonalAnime(season, year, page, 50)
      .then(({ media, pageInfo }) => {
        if (cancelled) return;
        setMedia(media);
        setPageInfo(pageInfo);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pageHref(targetPage: number) {
    return `/seasonal?season=${season}&year=${year}&page=${targetPage}`;
  }

  if (error) {
    return (
      <p className="py-16 text-center text-sm text-ash">
        Couldn&apos;t reach AniList just now. Try again in a moment.
      </p>
    );
  }

  if (!media) return <PageLoading />;

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
        <span>Page {pageInfo?.currentPage ?? page}</span>
        {pageInfo?.hasNextPage ? (
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

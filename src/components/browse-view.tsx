"use client";

// Client-fetched replacement for the old server-rendered Browse page (see
// src/lib/anilist-client.ts's file comment for why: every browsing page
// now calls AniList directly from the visitor's own browser instead of
// through the server, and nothing gets cached/stored server-side anymore).
//
// KNOWN REGRESSION, flagged not hidden: the old browse.ts routed a search
// term through a local AnimeTitle title index first (AniList's own search
// is fuzzy/similarity-based and returns nothing for short fragments like
// "toni") — that index was itself a server-side store of AniList data, so
// it's gone along with AnimeCache. Search here goes straight to AniList's
// own (weaker) search field. Real quality tradeoff, not fixed by this
// pass — see .claude-session-state.md.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { browseAnime, type AnilistMedia } from "@/lib/anilist-client";
import { useTrackedIds } from "@/lib/use-tracked-ids";
import { AnimeCard } from "@/components/anime-card";
import { PageLoading } from "@/components/page-loading";

type PageInfo = { currentPage: number; hasNextPage: boolean };
type Query = {
  search?: string;
  genres?: string[];
  yearFrom?: number;
  yearTo?: number;
  formats?: string[];
  statuses?: string[];
  minScore?: number;
  sort?: string;
  page: number;
};

// Outer component just derives the query from the URL and keys the inner
// one by it — a distinct query mounts a fresh BrowseResults instance
// (fresh useState(null), no manual reset), which is what avoids setting
// state synchronously inside an effect on every param change.
export function BrowseView() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const query: Query = {
    search: searchParams.get("search") || undefined,
    genres: searchParams.get("genre")?.split(",").filter(Boolean),
    yearFrom: searchParams.get("yearFrom") ? Number(searchParams.get("yearFrom")) : undefined,
    yearTo: searchParams.get("yearTo") ? Number(searchParams.get("yearTo")) : undefined,
    formats: searchParams.get("format")?.split(",").filter(Boolean),
    statuses: searchParams.get("status")?.split(",").filter(Boolean),
    minScore: searchParams.get("minScore") ? Number(searchParams.get("minScore")) : undefined,
    sort: searchParams.get("sort") || undefined,
    page,
  };

  return <BrowseResults key={searchParams.toString()} query={query} />;
}

function BrowseResults({ query }: { query: Query }) {
  const searchParams = useSearchParams();
  const trackedIds = useTrackedIds();
  const [media, setMedia] = useState<AnilistMedia[] | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    browseAnime({ ...query, perPage: 50 })
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
    // query is a fresh object every render by construction, but this
    // component itself is remounted (via BrowseView's key) whenever the
    // query actually changes — so this only ever needs to run once per
    // mount, on the query this instance was created with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `/browse?${params.toString()}`;
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
        {query.page > 1 ? (
          <Link href={pageHref(query.page - 1)} className="transition-colors hover:text-paper">
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        <span>Page {pageInfo?.currentPage ?? query.page}</span>
        {pageInfo?.hasNextPage ? (
          <Link href={pageHref(query.page + 1)} className="transition-colors hover:text-paper">
            Next →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </>
  );
}

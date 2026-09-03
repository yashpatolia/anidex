"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getRecommendationRails, type RecommendationRail } from "@/lib/recommendations-client";
import { AnimeRail } from "@/components/anime-rail";
import { PageLoading } from "@/components/page-loading";

export function RecommendationsView() {
  const { data: session } = useSession();
  const anilistUsername = session?.user?.name ?? null;
  const [rails, setRails] = useState<RecommendationRail[] | null>(null);

  useEffect(() => {
    if (!anilistUsername) return;
    let cancelled = false;
    getRecommendationRails(anilistUsername, 8, 18)
      .then((r) => {
        if (!cancelled) setRails(r);
      })
      .catch(() => {
        // Best-effort — falls back to the "nothing to recommend" state
        // below rather than crashing the page on a transient AniList error.
        if (!cancelled) setRails([]);
      });
    return () => {
      cancelled = true;
    };
  }, [anilistUsername]);

  if (!rails) return <PageLoading />;

  if (rails.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-8 text-center">
        <h1 className="font-display text-3xl text-paper">Nothing to recommend yet.</h1>
        <p className="text-sm text-ash">
          Mark something as Watching or Completed and recommendations based on it will show up
          here.
        </p>
        <Link
          href="/browse"
          className="mt-2 border border-hanko bg-hanko px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
        >
          Browse anime
        </Link>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-col">
      <header className="flex flex-col gap-2 px-8 py-12 2xl:px-16">
        <h1 className="font-display text-3xl text-paper">Recommended for you</h1>
        <p className="text-sm text-ash">Based on what you&apos;ve watched, not tracked anywhere yet.</p>
      </header>

      {rails.map((rail) => (
        <AnimeRail key={rail.title} title={rail.title} media={rail.media} />
      ))}
    </main>
  );
}

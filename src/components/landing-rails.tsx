"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLandingRails, type AnilistMedia } from "@/lib/anilist-client";
import { getRecommendationRails, type RecommendationRail } from "@/lib/recommendations-client";
import { useTrackedIds } from "@/lib/use-tracked-ids";
import { AnimeRail } from "@/components/anime-rail";
import { HeroGallery } from "@/components/hero-gallery";

// Client-fetched (see anilist-client.ts's file comment) — the whole page
// body, not just the rails: HeroGallery has to sit inside the same grid
// section as the hero copy (its second column), so splitting that from the
// full-width rails below into two separate components would mean either
// fetching the same data twice or threading state through a parent in a
// way that's more convoluted than just rendering the session-derived hero
// copy here too, passed down as the one boolean it actually depends on.
export function LandingRails({ signedIn }: { signedIn: boolean }) {
  const trackedIds = useTrackedIds();
  const [rails, setRails] = useState<{ trending: AnilistMedia[]; popular: AnilistMedia[]; topRated: AnilistMedia[] } | null>(
    null,
  );
  const [recommended, setRecommended] = useState<RecommendationRail[]>([]);

  useEffect(() => {
    let cancelled = false;
    getLandingRails(24).then((r) => {
      if (!cancelled) setRails(r);
    });
    // Only ever the single top row here — Home also serves signed-out
    // visitors browsing the public trending/popular rails, so this stays a
    // light, single-row taste of what /recommendations has more of, not a
    // second dedicated page's worth.
    if (signedIn) {
      getRecommendationRails(1, 18).then((r) => {
        if (!cancelled) setRecommended(r);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const galleryItems = (rails?.trending ?? [])
    .slice(0, 5)
    .map((anime) => {
      const src = anime.coverImage.extraLarge ?? anime.coverImage.large;
      if (!src) return null;
      const title = anime.title.english ?? anime.title.romaji ?? anime.title.native ?? "Untitled";
      return { id: anime.id, src, title };
    })
    .filter((item) => item !== null);

  return (
    <main className="flex flex-col">
      <section className="mx-auto grid w-full max-w-[1400px] grid-cols-1 px-8 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-16 2xl:px-16">
        <div className="flex flex-col justify-center gap-6 py-20 lg:py-32">
          <h1 className="max-w-lg font-display text-5xl leading-[1.05] text-paper lg:text-6xl">
            A record of everything you&apos;ve watched.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-ash">
            Search anime, track what you&apos;re watching, and rate what you&apos;ve
            finished. Your list lives in a database you own, not someone else&apos;s
            platform.
          </p>
          <div className="flex items-center gap-4 pt-2">
            <Link
              href={signedIn ? "/profile" : "/login"}
              className="border border-hanko bg-hanko px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
            >
              {signedIn ? "Go to your list" : "Start tracking"}
            </Link>
            <Link
              href="/browse"
              className="font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:text-paper"
            >
              {signedIn ? "Browse anime →" : "Browse without an account →"}
            </Link>
          </div>
        </div>

        <div className="pb-20 lg:pb-0">
          <HeroGallery items={galleryItems} />
        </div>
      </section>

      {recommended[0] && (
        <>
          <AnimeRail title={recommended[0].title} media={recommended[0].media} />
          <div className="-mt-4 px-8 pb-6 2xl:px-16">
            <Link
              href="/recommendations"
              className="font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:text-paper"
            >
              More recommendations →
            </Link>
          </div>
        </>
      )}
      <AnimeRail title="Trending now" media={rails?.trending ?? []} trackedIds={[...trackedIds]} />
      <AnimeRail title="All-time favorites" media={rails?.popular ?? []} trackedIds={[...trackedIds]} />
      <AnimeRail title="Top rated" media={rails?.topRated ?? []} trackedIds={[...trackedIds]} />
    </main>
  );
}

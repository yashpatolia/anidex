import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLandingRails } from "@/lib/anilist";
import { getTrackedAnilistIds } from "@/lib/list-status";
import { getRecommendationRails } from "@/lib/recommendations";
import { AnimeRail } from "@/components/anime-rail";
import { HeroGallery } from "@/components/hero-gallery";

export async function LandingPage() {
  const [session, { trending, popular, topRated }] = await Promise.all([
    auth(),
    getLandingRails(24),
  ]);
  const [trackedIds, recommended] = await Promise.all([
    session?.user ? [...(await getTrackedAnilistIds(session.user.id))] : [],
    // Only ever the single top-genre row here — Home also serves signed-out
    // visitors browsing the public trending/popular rails, so this stays a
    // light, single-row taste of what /recommendations has more of, not a
    // second dedicated page's worth.
    session?.user ? getRecommendationRails(session.user.id, { maxRails: 1, perRail: 18 }) : [],
  ]);

  const galleryItems = trending
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
              href={session?.user ? "/profile" : "/login"}
              className="border border-hanko bg-hanko px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
            >
              {session?.user ? "Go to your list" : "Start tracking"}
            </Link>
            <Link
              href="/browse"
              className="font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:text-paper"
            >
              {session?.user ? "Browse anime →" : "Browse without an account →"}
            </Link>
          </div>
        </div>

        <div className="pb-20 lg:pb-0">
          <HeroGallery items={galleryItems} />
        </div>
      </section>

      {recommended[0] && <AnimeRail title={recommended[0].title} media={recommended[0].media} />}
      <AnimeRail title="Trending now" media={trending} trackedIds={trackedIds} />
      <AnimeRail title="All-time favorites" media={popular} trackedIds={trackedIds} />
      <AnimeRail title="Top rated" media={topRated} trackedIds={trackedIds} />
      {recommended.length > 0 && (
        <div className="border-t border-line px-8 py-6 2xl:px-16">
          <Link
            href="/recommendations"
            className="font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:text-paper"
          >
            More recommendations →
          </Link>
        </div>
      )}
    </main>
  );
}

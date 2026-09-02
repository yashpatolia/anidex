// Recommendation rows, scored entirely from data already on hand — no new
// AniList calls (per ROADMAP.md's cheaper option): the signal is every
// anime the user has actually watched (Completed/Watching/Rewatching, not
// Planned or Dropped), aggregated into a genre profile, then scored
// against a candidate pool pulled straight from the shared AnimeCache
// table (already warmed by Browse/Seasonal/Profile/search traffic across
// every user, not just this one).
//
// Deliberately not one row per specific completed anime ("because you
// completed X") — a first version worked that way and the same handful of
// popular titles kept showing up across nearly every row, since a
// genre-homogeneous list (e.g. a lot of rom-coms) makes every individual
// anchor's genre triple overlap heavily with every other anchor's. Rows
// are now built one at a time from the user's top genres overall, each
// pulling from a shrinking shared candidate pool (global dedupe), so
// nothing can repeat across rows by construction.
//
// Server-only: imports Prisma directly.
import { prisma } from "@/lib/prisma";
import { getCachedAnimeCardsByIds } from "@/lib/anime-cache";
import type { AnilistMedia } from "@/lib/anilist";

// Pulled into JS and scored there rather than querying AnimeCache's `data`
// JSON column for genre containment — simpler and safer than relying on
// Prisma's JSON-path filter semantics for a field that holds two different
// shapes (see anime-cache.ts). Capped so this stays cheap as the cache
// grows; revisit if AnimeCache's real size ever makes this pool stale or
// unrepresentative (see SCALABILITY.md for the shape of that conversation).
const CANDIDATE_POOL_LIMIT = 1000;

const WATCHED_STATUSES = new Set(["COMPLETED", "WATCHING", "REWATCHING"]);

export type RecommendationRail = {
  title: string;
  media: AnilistMedia[];
};

export async function getRecommendationRails(
  userId: string,
  { maxRails, perRail }: { maxRails: number; perRail: number },
): Promise<RecommendationRail[]> {
  const entries = await prisma.animeListEntry.findMany({
    where: { userId },
    select: { anilistId: true, status: true },
  });
  if (entries.length === 0) return [];

  // Excluded from candidates below regardless of status — recommendations
  // should only ever surface something genuinely new, including things
  // only Planned or already Dropped.
  const trackedIds = new Set(entries.map((e) => e.anilistId));

  const watchedIds = entries.filter((e) => WATCHED_STATUSES.has(e.status)).map((e) => e.anilistId);
  if (watchedIds.length === 0) return [];

  const [watchedMedia, pool] = await Promise.all([
    getCachedAnimeCardsByIds(watchedIds),
    prisma.animeCache.findMany({
      orderBy: { updatedAt: "desc" },
      take: CANDIDATE_POOL_LIMIT,
      select: { data: true },
    }),
  ]);

  const genreCounts = new Map<string, number>();
  for (const m of watchedMedia) {
    for (const g of m.genres) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxRails)
    .map(([genre]) => genre);
  if (topGenres.length === 0) return [];

  const candidates = pool
    .map((row) => row.data as unknown as AnilistMedia)
    .filter((m) => m?.id != null && !trackedIds.has(m.id));

  const usedIds = new Set<number>();
  const rails: RecommendationRail[] = [];
  for (const genre of topGenres) {
    const media = candidates
      .filter((c) => !usedIds.has(c.id) && c.genres.includes(genre))
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, perRail);
    if (media.length === 0) continue;

    for (const m of media) usedIds.add(m.id);
    rails.push({ title: `More ${genre}`, media });
  }
  return rails;
}

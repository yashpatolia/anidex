// Recommendation rows, scored entirely from data already on hand — no new
// AniList calls (per ROADMAP.md's cheaper option): the signal is every
// anime the user has actually watched (Completed/Watching/Rewatching, not
// Planned or Dropped), aggregated into a genre-pair profile, then scored
// against a candidate pool pulled straight from the shared AnimeCache
// table (already warmed by Browse/Seasonal/Profile/search traffic across
// every user, not just this one).
//
// Two earlier shapes, both replaced:
// 1. One row per specific completed anime ("because you completed X") —
//    the same handful of popular titles kept showing up across nearly
//    every row, since a genre-homogeneous list (e.g. a lot of rom-coms)
//    makes every individual anchor's genre triple overlap heavily with
//    every other anchor's.
// 2. One row per individual top genre ("More Romance", "More Comedy") —
//    fixed the overlap (global dedupe, see below) but lost real signal:
//    an anime tagged both Romance and Slice of Life is a much more
//    specific taste match than "watches some Romance and separately some
//    Slice of Life" treated independently.
// Rows are now built from the user's most common genre *pairs* — how
// often two genres show up together on the same watched anime, not each
// genre's standalone count — so a candidate has to share the actual
// combination, not just one genre from it. Rows are built one at a time
// from a shrinking shared candidate pool (global dedupe), so nothing can
// repeat across rows by construction.
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

  // Genre-pair counts: for each watched anime, every distinct pair among
  // its own genres counts once (a Comedy/Drama/Romance show contributes to
  // Comedy+Drama, Comedy+Romance, and Drama+Romance alike) — this is what
  // "watches a lot of Romance *and* Slice of Life together" actually means,
  // versus counting Romance and Slice of Life as two unrelated totals.
  const genreCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>();
  for (const m of watchedMedia) {
    const genres = [...new Set(m.genres)].sort();
    for (const g of genres) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    for (let i = 0; i < genres.length; i++) {
      for (let j = i + 1; j < genres.length; j++) {
        const key = `${genres[i]}|${genres[j]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }
  if (genreCounts.size === 0) return [];

  const topPairs = [...pairCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key.split("|") as [string, string]);
  // Fallback for a watch history too small/varied to have repeated pairs —
  // top individual genres fill out any remaining rows so there's still
  // "a bunch of recommendations" rather than just one or two rows.
  const topSingles = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => [g] as const);

  const candidates = pool
    .map((row) => row.data as unknown as AnilistMedia)
    .filter((m) => m?.id != null && !trackedIds.has(m.id));

  const usedIds = new Set<number>();
  const usedGroups = new Set<string>();
  const rails: RecommendationRail[] = [];

  for (const group of [...topPairs, ...topSingles]) {
    if (rails.length >= maxRails) break;
    const groupKey = [...group].sort().join("|");
    if (usedGroups.has(groupKey)) continue;

    const media = candidates
      .filter((c) => !usedIds.has(c.id) && group.every((g) => c.genres.includes(g)))
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, perRail);
    if (media.length === 0) continue;

    usedGroups.add(groupKey);
    for (const m of media) usedIds.add(m.id);
    rails.push({ title: `More ${group.join(" & ")}`, media });
  }
  return rails;
}

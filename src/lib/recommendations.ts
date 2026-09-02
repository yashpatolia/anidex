// Recommendation rows, scored entirely from data already on hand — no new
// AniList calls (per ROADMAP.md's cheaper option): the signal is every
// anime the user has actually watched (Completed/Watching/Rewatching, not
// Planned), aggregated into a genre-pair profile, then scored against a
// candidate pool pulled straight from the shared AnimeCache table (already
// warmed by Browse/Seasonal/Profile/search traffic across every user, not
// just this one).
//
// Iterations so far:
// 1. One row per specific completed anime ("because you completed X") —
//    the same handful of popular titles kept showing up across nearly
//    every row, since a genre-homogeneous list (e.g. a lot of rom-coms)
//    makes every individual anchor's genre triple overlap heavily with
//    every other anchor's.
// 2. One row per individual top genre ("More Romance", "More Comedy") —
//    fixed the overlap (global dedupe, see below) but lost real signal:
//    an anime tagged both Romance and Slice of Life is a much more
//    specific taste match than "watches some Romance and separately some
//    Slice of Life" treated independently. Fixed by grouping on genre
//    *pairs* — how often two genres co-occur on the same watched anime.
// 3. Every watched anime counted the same regardless of how much the user
//    actually liked it, and Dropped shows contributed nothing at all
//    despite being real information. Now: watched anime are weighted by
//    score (an unscored watch still counts at a neutral baseline, so not
//    scoring something isn't penalized), and Dropped anime actively
//    subtract from their genres'/pairs' totals — a pair the user keeps
//    dropping shouldn't get recommended just because it also shows up in
//    a couple of completed favorites.
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

// A dropped show rarely has a score attached (people don't usually bother
// rating something they gave up on), so this is a flat penalty rather than
// score-scaled — same order of magnitude as one neutral (unscored) watch,
// so a single drop can cancel out a single lukewarm watch of the same
// pairing rather than needing several to make a dent.
const DROP_PENALTY = 1;

function scoreWeight(score: number | null): number {
  return score != null ? score / 10 : 1;
}

function genrePairs(genres: string[]): string[] {
  const sorted = [...new Set(genres)].sort();
  const pairs: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) pairs.push(`${sorted[i]}|${sorted[j]}`);
  }
  return pairs;
}

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
    select: { anilistId: true, status: true, score: true },
  });
  if (entries.length === 0) return [];

  // Excluded from candidates below regardless of status — recommendations
  // should only ever surface something genuinely new, including things
  // only Planned or already Dropped.
  const trackedIds = new Set(entries.map((e) => e.anilistId));

  const watched = entries.filter((e) => WATCHED_STATUSES.has(e.status));
  const dropped = entries.filter((e) => e.status === "DROPPED");
  if (watched.length === 0) return [];

  const [media, pool] = await Promise.all([
    getCachedAnimeCardsByIds([...watched, ...dropped].map((e) => e.anilistId)),
    prisma.animeCache.findMany({
      orderBy: { updatedAt: "desc" },
      take: CANDIDATE_POOL_LIMIT,
      select: { data: true },
    }),
  ]);
  const mediaById = new Map(media.map((m) => [m.id, m]));

  const genreCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>();

  for (const e of watched) {
    const m = mediaById.get(e.anilistId);
    if (!m) continue;
    const weight = scoreWeight(e.score);
    for (const g of new Set(m.genres)) genreCounts.set(g, (genreCounts.get(g) ?? 0) + weight);
    for (const pair of genrePairs(m.genres)) pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + weight);
  }
  for (const e of dropped) {
    const m = mediaById.get(e.anilistId);
    if (!m) continue;
    for (const g of new Set(m.genres)) genreCounts.set(g, (genreCounts.get(g) ?? 0) - DROP_PENALTY);
    for (const pair of genrePairs(m.genres)) pairCounts.set(pair, (pairCounts.get(pair) ?? 0) - DROP_PENALTY);
  }

  // A net-negative genre/pair (dropped more/harder than it was ever
  // enjoyed) shouldn't generate a recommendation row at all, not just rank
  // lower than everything else.
  const topPairs = [...pairCounts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key.split("|") as [string, string]);
  // Fallback for a watch history too small/varied to have repeated pairs —
  // top individual genres fill out any remaining rows so there's still
  // "a bunch of recommendations" rather than just one or two rows.
  const topSingles = [...genreCounts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => [g] as const);
  if (topPairs.length === 0 && topSingles.length === 0) return [];

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

    const rowMedia = candidates
      .filter((c) => !usedIds.has(c.id) && group.every((g) => c.genres.includes(g)))
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, perRail);
    if (rowMedia.length === 0) continue;

    usedGroups.add(groupKey);
    for (const m of rowMedia) usedIds.add(m.id);
    rails.push({ title: `More ${group.join(" & ")}`, media: rowMedia });
  }
  return rails;
}

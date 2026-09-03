"use client";

// Client-fetched genre-pair recommendations, following the same
// architecture shift as everywhere else (see anilist-client.ts's file
// comment). This is the same scoring algorithm the app used before it was
// briefly replaced by AniList's own recommendations connection: the
// signal is every anime the user has actually watched (Completed/
// Watching/Rewatching, not Planned), aggregated into a genre-pair profile,
// then scored against a live AniList candidate pool instead of the old
// server-side AnimeCache table (gone, along with all server-side AniList
// storage - see anilist-client.ts).
//
// Iterations that got it here (kept from the original file, still true):
// 1. One row per specific completed anime ("because you completed X") -
//    the same handful of popular titles kept showing up across nearly
//    every row, since a genre-homogeneous list (e.g. a lot of rom-coms)
//    makes every individual anchor's genre triple overlap heavily with
//    every other anchor's.
// 2. One row per individual top genre ("More Romance", "More Comedy") -
//    fixed the overlap (global dedupe, see below) but lost real signal:
//    an anime tagged both Romance and Slice of Life is a much more
//    specific taste match than "watches some Romance and separately some
//    Slice of Life" treated independently. Fixed by grouping on genre
//    *pairs* - how often two genres co-occur on the same watched anime.
// 3. Every watched anime counted the same regardless of how much the user
//    actually liked it, and Dropped shows contributed nothing at all
//    despite being real information. Now: watched anime are weighted by
//    score (an unscored watch still counts at a neutral baseline, so not
//    scoring something isn't penalized), and Dropped anime actively
//    subtract from their genres'/pairs' totals - a pair the user keeps
//    dropping shouldn't get recommended just because it also shows up in
//    a couple of completed favorites.
import { getUserMediaList, getMediaByGenreGroups, type AnilistMedia, type AnilistListEntry } from "@/lib/anilist-client";

const WATCHED_STATUSES = new Set(["COMPLETED", "WATCHING", "REWATCHING"]);

// A dropped show rarely has a score attached (people don't usually bother
// rating something they gave up on), so this is a flat penalty rather than
// score-scaled - same order of magnitude as one neutral (unscored) watch,
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

// Top-level entry point: fetches the user's own list itself, then scores
// it. Used by the standalone /recommendations page, which has nothing
// else on it that already needs that same list.
export async function getRecommendationRails(
  anilistUsername: string,
  maxRails: number,
  perRail: number,
): Promise<RecommendationRail[]> {
  const entries = await getUserMediaList(anilistUsername);
  return buildRecommendationRails(entries, maxRails, perRail);
}

// Takes an already-fetched list instead of fetching its own — for a caller
// that already needs the user's full list for something else on the same
// page (e.g. landing-rails.tsx also needs it for the tracked-ids overlay
// on every card), so there's exactly one getUserMediaList call per page
// load instead of two identical ones.
export async function buildRecommendationRails(
  entries: AnilistListEntry[],
  maxRails: number,
  perRail: number,
): Promise<RecommendationRail[]> {
  if (entries.length === 0) return [];

  // Excluded from candidates below regardless of status - recommendations
  // should only ever surface something genuinely new, including things
  // only Planned or already Dropped.
  const trackedIds = new Set(entries.map((e) => e.anime.id));

  const watched = entries.filter((e) => WATCHED_STATUSES.has(e.status));
  const dropped = entries.filter((e) => e.status === "DROPPED");
  if (watched.length === 0) return [];

  const genreCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>();

  for (const e of watched) {
    const weight = scoreWeight(e.score);
    for (const g of new Set(e.anime.genres)) genreCounts.set(g, (genreCounts.get(g) ?? 0) + weight);
    for (const pair of genrePairs(e.anime.genres)) pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + weight);
  }
  for (const e of dropped) {
    for (const g of new Set(e.anime.genres)) genreCounts.set(g, (genreCounts.get(g) ?? 0) - DROP_PENALTY);
    for (const pair of genrePairs(e.anime.genres)) pairCounts.set(pair, (pairCounts.get(pair) ?? 0) - DROP_PENALTY);
  }

  // A net-negative genre/pair (dropped more/harder than it was ever
  // enjoyed) shouldn't generate a recommendation row at all, not just rank
  // lower than everything else.
  const topPairs = [...pairCounts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key.split("|"));
  // Fallback for a watch history too small/varied to have repeated pairs -
  // top individual genres fill out any remaining rows so there's still
  // "a bunch of recommendations" rather than just one or two rows.
  const topSingles = [...genreCounts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => [g]);
  if (topPairs.length === 0 && topSingles.length === 0) return [];

  // Only fetch candidate pools for as many groups as could possibly be
  // needed (maxRails, since each group either becomes exactly one row or
  // is skipped entirely) - no point fetching a pool for a genre pair far
  // down the ranking that'll never be reached.
  const candidateGroups = [...topPairs, ...topSingles].slice(0, maxRails);
  const pools = await getMediaByGenreGroups(candidateGroups);

  const usedIds = new Set<number>();
  const usedGroups = new Set<string>();
  const rails: RecommendationRail[] = [];

  for (let i = 0; i < candidateGroups.length; i++) {
    if (rails.length >= maxRails) break;
    const group = candidateGroups[i];
    const groupKey = [...group].sort().join("|");
    if (usedGroups.has(groupKey)) continue;

    const rowMedia = pools[i]
      .filter(
        (c) => !trackedIds.has(c.id) && !usedIds.has(c.id) && group.every((g) => c.genres.includes(g)),
      )
      .slice(0, perRail);
    if (rowMedia.length === 0) continue;

    usedGroups.add(groupKey);
    for (const m of rowMedia) usedIds.add(m.id);
    rails.push({ title: `More ${group.join(" & ")}`, media: rowMedia });
  }
  return rails;
}

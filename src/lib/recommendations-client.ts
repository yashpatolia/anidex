"use client";

// Client-fetched replacement for recommendations.ts, following the same
// architecture shift as everywhere else (see anilist-client.ts's file
// comment). The old server version scored candidates pulled from the
// AnimeCache table — that's server-side storage of AniList data, gone for
// the same reason AnimeCache itself is going. AniList's own per-anime
// `recommendations` connection (real community data, computed by AniList
// from their whole userbase — see anilist-client.ts's
// AnilistMediaDetail.recommendations) replaces the local candidate pool
// entirely: for each of the signed-in user's highest-scored watched
// anime, pull that anime's own AniList recommendations, hydrate them to
// full cards, exclude what's already tracked, dedupe across rows.
import { getAnimeByIds, getAnimeCardsByIds, type AnilistMedia } from "@/lib/anilist-client";

const WATCHED_STATUSES = new Set(["COMPLETED", "WATCHING", "REWATCHING"]);

// Pull more anchors than maxRails needs, since some anchors' recommended
// titles will turn out to be entirely already-tracked or already used by
// a higher-scored anchor's row and get skipped.
const ANCHOR_MULTIPLIER = 3;

export type RecommendationRail = {
  title: string;
  media: AnilistMedia[];
};

type RawEntry = { anilistId: number; status: string; score: number | null };

export async function getRecommendationRails(
  maxRails: number,
  perRail: number,
): Promise<RecommendationRail[]> {
  const res = await fetch("/api/list/raw");
  if (!res.ok) return [];
  const { entries }: { entries: RawEntry[] } = await res.json();
  if (entries.length === 0) return [];

  const trackedIds = new Set(entries.map((e) => e.anilistId));
  const watched = entries.filter((e) => WATCHED_STATUSES.has(e.status));
  if (watched.length === 0) return [];

  const anchors = [...watched]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, maxRails * ANCHOR_MULTIPLIER);

  const anchorDetails = await getAnimeByIds(anchors.map((a) => a.anilistId));
  const detailByAnilistId = new Map(anchorDetails.map((d) => [d.id, d]));

  const candidateIds = [
    ...new Set(
      anchorDetails.flatMap((d) =>
        d.recommendations.nodes.map((n) => n.mediaRecommendation?.id).filter((id): id is number => id != null),
      ),
    ),
  ];
  const candidateCards = await getAnimeCardsByIds(candidateIds);
  const cardById = new Map(candidateCards.map((c) => [c.id, c]));

  const usedIds = new Set<number>();
  const rails: RecommendationRail[] = [];

  for (const anchor of anchors) {
    if (rails.length >= maxRails) break;
    const detail = detailByAnilistId.get(anchor.anilistId);
    if (!detail) continue;

    const rowMedia = detail.recommendations.nodes
      .map((n) => n.mediaRecommendation)
      .filter((m): m is AnilistMedia => m != null)
      .map((m) => cardById.get(m.id))
      .filter((c): c is AnilistMedia => c != null && !trackedIds.has(c.id) && !usedIds.has(c.id))
      .slice(0, perRail);
    if (rowMedia.length === 0) continue;

    for (const m of rowMedia) usedIds.add(m.id);
    const anchorTitle = detail.title.english ?? detail.title.romaji ?? detail.title.native ?? "this";
    rails.push({ title: `Because you watched ${anchorTitle}`, media: rowMedia });
  }
  return rails;
}

// Turns parsed source-list entries (MAL XML rows, AniList API rows) into
// our own shape: a resolved anilistId plus status/score/progress already
// mapped onto WatchStatus and our 1-10 score scale. Anime that can't be
// matched to an AniList id are returned separately so the UI can show them
// as skipped rather than silently dropping them.
import { getAnilistIdsByMalIds, searchAnime, type AnilistListEntry } from "@/lib/anilist";
import { ANILIST_STATUS_TO_OURS, type WatchStatus } from "@/lib/anilist-shared";
import type { MalEntry } from "./mal-parser";

export type ResolvedEntry = {
  anilistId: number;
  title: string;
  status: WatchStatus;
  score: number | null;
  progress: number;
};

export type UnmatchedEntry = {
  title: string;
  reason: string;
};

const MAL_STATUS_MAP: Record<MalEntry["status"], WatchStatus> = {
  Watching: "WATCHING",
  Completed: "COMPLETED",
  "On-Hold": "PAUSED",
  Dropped: "DROPPED",
  "Plan to Watch": "PLANNED",
};

export async function resolveMalEntries(
  entries: MalEntry[],
): Promise<{ resolved: ResolvedEntry[]; unmatched: UnmatchedEntry[] }> {
  // Primary path: AniList tracks each anime's MAL id, so most entries
  // resolve in a couple of batched lookups with no ambiguity.
  const idMap = await getAnilistIdsByMalIds(entries.map((e) => e.malId));

  const resolved: ResolvedEntry[] = [];
  const stillUnmatched: MalEntry[] = [];

  for (const entry of entries) {
    const anilistId = idMap.get(entry.malId);
    if (anilistId) {
      resolved.push(toResolved(anilistId, entry));
    } else {
      stillUnmatched.push(entry);
    }
  }

  // Fallback: a handful of older/obscure entries AniList doesn't have a MAL
  // id for. Try an exact (case-insensitive) title match against a live
  // AniList title search before giving up on them — this used to check a
  // local title index instead, but that was itself a server-side store of
  // AniList data (same category as the AnimeCache table), so it's gone.
  // A live search call here is fine under the new no-storage rule: it's a
  // one-time pass-through during an explicit, user-initiated import, not
  // anything cached or persisted.
  const unmatched: UnmatchedEntry[] = [];
  for (const entry of stillUnmatched) {
    const { media } = await searchAnime(entry.title, 1, 5);
    const lowerTitle = entry.title.toLowerCase();
    const match = media.find(
      (m) =>
        m.title.romaji?.toLowerCase() === lowerTitle ||
        m.title.english?.toLowerCase() === lowerTitle ||
        m.title.native?.toLowerCase() === lowerTitle,
    );
    if (match) {
      resolved.push(toResolved(match.id, entry));
    } else {
      unmatched.push({ title: entry.title, reason: "No matching anime found" });
    }
  }

  return { resolved, unmatched };
}

function toResolved(anilistId: number, entry: MalEntry): ResolvedEntry {
  return {
    anilistId,
    title: entry.title,
    status: entry.rewatching && entry.status === "Watching" ? "REWATCHING" : MAL_STATUS_MAP[entry.status],
    score: entry.score > 0 ? entry.score : null,
    progress: entry.progress,
  };
}

export function resolveAnilistEntries(entries: AnilistListEntry[]): ResolvedEntry[] {
  return entries.map((e) => ({
    anilistId: e.anilistId,
    title: `#${e.anilistId}`, // real title gets filled in by the preview route's live AniList lookup
    status: ANILIST_STATUS_TO_OURS[e.status] ?? "PLANNED",
    score: e.score > 0 ? Math.round(e.score) : null,
    progress: e.progress,
  }));
}

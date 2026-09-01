// Turns parsed source-list entries (MAL XML rows, AniList API rows) into
// our own shape: a resolved anilistId plus status/score/progress already
// mapped onto WatchStatus and our 1-10 score scale. Anime that can't be
// matched to an AniList id are returned separately so the UI can show them
// as skipped rather than silently dropping them.
import { prisma } from "@/lib/prisma";
import { getAnilistIdsByMalIds, type AnilistListEntry } from "@/lib/anilist";
import { WatchStatus } from "@/generated/prisma/client";
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
  Watching: WatchStatus.WATCHING,
  Completed: WatchStatus.COMPLETED,
  "On-Hold": WatchStatus.PAUSED,
  Dropped: WatchStatus.DROPPED,
  "Plan to Watch": WatchStatus.PLANNED,
};

const ANILIST_STATUS_MAP: Record<string, WatchStatus> = {
  CURRENT: WatchStatus.WATCHING,
  PLANNING: WatchStatus.PLANNED,
  COMPLETED: WatchStatus.COMPLETED,
  DROPPED: WatchStatus.DROPPED,
  PAUSED: WatchStatus.PAUSED,
  REPEATING: WatchStatus.REWATCHING,
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
  // id for. Try an exact (case-insensitive) title match against our local
  // title index before giving up on them.
  const unmatched: UnmatchedEntry[] = [];
  for (const entry of stillUnmatched) {
    const match = await prisma.$queryRaw<{ anilistId: number }[]>`
      SELECT "anilistId" FROM "AnimeTitle"
      WHERE LOWER(romaji) = LOWER(${entry.title})
         OR LOWER(english) = LOWER(${entry.title})
         OR LOWER(native) = LOWER(${entry.title})
      ORDER BY popularity DESC
      LIMIT 1
    `;
    if (match[0]) {
      resolved.push(toResolved(match[0].anilistId, entry));
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
    status: entry.rewatching && entry.status === "Watching" ? WatchStatus.REWATCHING : MAL_STATUS_MAP[entry.status],
    score: entry.score > 0 ? entry.score : null,
    progress: entry.progress,
  };
}

export function resolveAnilistEntries(entries: AnilistListEntry[]): ResolvedEntry[] {
  return entries.map((e) => ({
    anilistId: e.anilistId,
    title: `#${e.anilistId}`, // real title gets filled in by the preview route via AnimeCache
    status: ANILIST_STATUS_MAP[e.status] ?? WatchStatus.PLANNED,
    score: e.score > 0 ? Math.round(e.score) : null,
    progress: e.progress,
  }));
}

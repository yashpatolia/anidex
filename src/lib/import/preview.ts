// Shared by both source-specific preview routes: hydrates resolved entries
// with real title/cover art via the existing AnimeCache, and flags which
// ones the current user already has tracked (so the UI can distinguish new
// additions from updates before anything is written).
import { prisma } from "@/lib/prisma";
import { getCachedAnimeByIds } from "@/lib/anime-cache";
import type { ResolvedEntry } from "./resolve";

export type PreviewRow = {
  anilistId: number;
  title: string;
  coverImage: string | null;
  status: string;
  score: number | null;
  progress: number;
  alreadyTracked: boolean;
};

export async function buildPreview(userId: string, resolved: ResolvedEntry[]) {
  const ids = resolved.map((e) => e.anilistId);
  const [media, existing, totalTracked] = await Promise.all([
    getCachedAnimeByIds(ids),
    prisma.animeListEntry.findMany({
      where: { userId, anilistId: { in: ids } },
      select: { anilistId: true },
    }),
    prisma.animeListEntry.count({ where: { userId } }),
  ]);

  const mediaById = new Map(media.map((m) => [m.id, m]));
  const trackedIds = new Set(existing.map((e) => e.anilistId));

  const rows: PreviewRow[] = resolved.map((e) => {
    const m = mediaById.get(e.anilistId);
    return {
      anilistId: e.anilistId,
      title: m ? (m.title.english ?? m.title.romaji ?? m.title.native ?? e.title) : e.title,
      coverImage: m?.coverImage.large ?? null,
      status: e.status,
      score: e.score,
      progress: e.progress,
      alreadyTracked: trackedIds.has(e.anilistId),
    };
  });

  const existingCount = rows.filter((r) => r.alreadyTracked).length;

  return {
    rows,
    newCount: rows.filter((r) => !r.alreadyTracked).length,
    existingCount,
    // How many entries currently on the user's list are NOT in this import
    // — i.e. what "Replace my entire list" would delete. Computed from the
    // total count rather than a second big query.
    notInImportCount: Math.max(0, totalTracked - existingCount),
  };
}

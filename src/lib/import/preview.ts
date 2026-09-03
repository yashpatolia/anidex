// Shared by both source-specific preview routes: hydrates resolved entries
// with real title/cover art, and flags which ones the current user already
// has tracked on AniList (so the UI can distinguish new additions from
// updates before anything is written).
//
// Stayed server-side deliberately (unlike Browse/Seasonal/etc.): this is a
// one-time, explicit, user-initiated action, not routine browsing traffic —
// same reasoning as resolve.ts's live fallback. Uses src/lib/anilist.ts,
// which is a live, uncached pass-through (no server-side storage), not the
// old AnimeCache-backed version this used to read from. "Already tracked"
// now means already on the user's real AniList list (getAnilistUserList)
// rather than our own AnimeListEntry table — that table's gone; AniList is
// the only copy of list data now (see anilist-client.ts's file comment).
import { prisma } from "@/lib/prisma";
import { getAnimeCardsByIds, getAnilistUserList } from "@/lib/anilist";
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
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  const [media, current] = await Promise.all([
    getAnimeCardsByIds(ids),
    user?.name ? getAnilistUserList(user.name) : Promise.resolve([]),
  ]);

  const mediaById = new Map(media.map((m) => [m.id, m]));
  const trackedIds = new Set(current.map((e) => e.anilistId));
  const totalTracked = current.length;

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

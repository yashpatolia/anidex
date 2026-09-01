// Server-only. One cheap indexed query (userId is indexed) to know which of
// a page's anime are already on the signed-in user's list, so AnimeCard's
// quick-add button can show the correct state instead of always defaulting
// to "+" even for anime that are already tracked.
import { prisma } from "@/lib/prisma";

export async function getTrackedAnilistIds(userId: string): Promise<Set<number>> {
  const entries = await prisma.animeListEntry.findMany({
    where: { userId },
    select: { anilistId: true },
  });
  return new Set(entries.map((e) => e.anilistId));
}

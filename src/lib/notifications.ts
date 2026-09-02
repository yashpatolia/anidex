// Episode-aired notifications. Generated lazily (see the Notification model
// comment in schema.prisma) rather than by a scheduled job: syncEpisode
// Notifications is called once per bell-open, checks the user's own
// Watching/Rewatching list against AniList's airing data, and inserts a row
// for any episode that's aired since their last logged progress. The
// (userId, anilistId, episode) unique constraint makes re-running this on
// every open safe — already-notified episodes are silently skipped, never
// duplicated.
//
// Server-only: imports Prisma directly.
import { prisma } from "@/lib/prisma";
import { getNextEpisodesByIds } from "@/lib/anilist";
import { getCachedAnimeCardsByIds } from "@/lib/anime-cache";
import type { AnilistMedia } from "@/lib/anilist";
import type { WatchStatus } from "@/generated/prisma/client";

const WATCHING_STATUSES: WatchStatus[] = ["WATCHING", "REWATCHING"];

// Caps how far back a first-time (or long-overdue) sync can reach, so a
// show that's sat unwatched for months doesn't dump a huge backlog of
// "new episode" rows the first time this runs for someone — only the most
// recent few count as worth notifying about at once.
const MAX_BACKLOG_EPISODES = 5;

export async function syncEpisodeNotifications(userId: string): Promise<void> {
  const entries = await prisma.animeListEntry.findMany({
    where: { userId, status: { in: WATCHING_STATUSES } },
    select: { anilistId: true, progress: true },
  });
  if (entries.length === 0) return;

  const nextEpisodes = await getNextEpisodesByIds(entries.map((e) => e.anilistId));
  const nextByAnilistId = new Map(nextEpisodes.map((n) => [n.id, n.nextAiringEpisode]));

  const rows: { userId: string; anilistId: number; episode: number }[] = [];
  for (const entry of entries) {
    const next = nextByAnilistId.get(entry.anilistId);
    if (!next) continue; // not currently airing (finished, movie, or unmatched)

    const airedCount = next.episode - 1;
    if (airedCount <= entry.progress) continue; // nothing new since they last logged progress

    const from = Math.max(entry.progress + 1, airedCount - MAX_BACKLOG_EPISODES + 1);
    for (let episode = from; episode <= airedCount; episode++) {
      rows.push({ userId, anilistId: entry.anilistId, episode });
    }
  }
  if (rows.length === 0) return;

  await prisma.notification.createMany({ data: rows, skipDuplicates: true });
}

export type NotificationItem = {
  id: string;
  episode: number;
  read: boolean;
  createdAt: string;
  anime: AnilistMedia;
};

export async function getNotifications(
  userId: string,
  limit = 20,
): Promise<{ items: NotificationItem[]; unreadCount: number }> {
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  const media = await getCachedAnimeCardsByIds(rows.map((r) => r.anilistId));
  const mediaById = new Map(media.map((m) => [m.id, m]));

  const items = rows
    .map((r) => {
      const anime = mediaById.get(r.anilistId);
      if (!anime) return null;
      return {
        id: r.id,
        episode: r.episode,
        read: r.read,
        createdAt: r.createdAt.toISOString(),
        anime,
      };
    })
    .filter((i) => i !== null);

  return { items, unreadCount };
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

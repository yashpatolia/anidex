"use client";

// Client-fetched replacement for the sync+hydrate half of
// src/lib/notifications.ts (see anilist-client.ts's file comment for the
// overall architecture) — this used to run on every bell-open, server-side,
// for every user, which is exactly the kind of routine traffic (not a
// one-time user-initiated action like import/export) the whole rewrite
// moved off the server. markNotificationRead/markAllNotificationsRead stay
// server-side in notifications.ts — they never touched AniList at all. The
// Watching/Rewatching list itself now comes straight from AniList too (see
// getUserMediaList), not our own DB — there's no local list left to check
// it against.
import { getNextEpisodesByIds, getAnimeCardsByIds, getUserMediaList, type AnilistMedia } from "@/lib/anilist-client";

export type NotificationItem = {
  id: string;
  episode: number;
  read: boolean;
  createdAt: string;
  anime: AnilistMedia;
};

// Caps how far back a first-time (or long-overdue) sync can reach, so a
// show that's sat unwatched for months doesn't dump a huge backlog of
// "new episode" rows the first time this runs for someone — only the most
// recent few count as worth notifying about at once.
const MAX_BACKLOG_EPISODES = 5;

async function syncEpisodeNotifications(anilistUsername: string): Promise<void> {
  const list = await getUserMediaList(anilistUsername);
  const entries = list
    .filter((e) => e.status === "WATCHING" || e.status === "REWATCHING")
    .map((e) => ({ anilistId: e.anime.id, progress: e.progress }));
  if (entries.length === 0) return;

  const nextEpisodes = await getNextEpisodesByIds(entries.map((e) => e.anilistId));
  const nextByAnilistId = new Map(nextEpisodes.map((n) => [n.id, n.nextAiringEpisode]));

  const rows: { anilistId: number; episode: number }[] = [];
  for (const entry of entries) {
    const next = nextByAnilistId.get(entry.anilistId);
    if (!next) continue; // not currently airing (finished, movie, or unmatched)

    const airedCount = next.episode - 1;
    if (airedCount <= entry.progress) continue; // nothing new since they last logged progress

    const from = Math.max(entry.progress + 1, airedCount - MAX_BACKLOG_EPISODES + 1);
    for (let episode = from; episode <= airedCount; episode++) {
      rows.push({ anilistId: entry.anilistId, episode });
    }
  }
  if (rows.length === 0) return;

  await fetch("/api/notifications/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
}

type RawNotification = { id: string; anilistId: number; episode: number; read: boolean; createdAt: string };

export async function syncAndGetNotifications(
  anilistUsername: string,
): Promise<{ items: NotificationItem[]; unreadCount: number }> {
  await syncEpisodeNotifications(anilistUsername);

  const res = await fetch("/api/notifications/raw");
  const { rows, unreadCount }: { rows: RawNotification[]; unreadCount: number } = await res.json();

  const media = await getAnimeCardsByIds(rows.map((r) => r.anilistId));
  const mediaById = new Map(media.map((m) => [m.id, m]));

  const items = rows
    .map((r) => {
      const anime = mediaById.get(r.anilistId);
      if (!anime) return null;
      return { id: r.id, episode: r.episode, read: r.read, createdAt: r.createdAt, anime };
    })
    .filter((i): i is NotificationItem => i !== null);

  return { items, unreadCount };
}

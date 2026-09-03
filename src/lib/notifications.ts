// Notification read-state, our own DB only — the actual episode-airing
// sync and hydration moved client-side (see notifications-client.ts and
// anilist-client.ts's file comment for why: this used to run server-side
// on every bell-open for every user, which is exactly the kind of routine
// traffic the whole rewrite moved off the server).
//
// Server-only: imports Prisma directly.
import { prisma } from "@/lib/prisma";

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

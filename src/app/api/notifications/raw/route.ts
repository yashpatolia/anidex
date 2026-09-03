import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

// GET /api/notifications/raw — the signed-in user's notification rows as-
// is (anilistId/episode/read/createdAt), no AniList hydration. Our own DB
// only; the client hydrates these with real anime data itself — see
// notifications-client.ts.
export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id,
      anilistId: r.anilistId,
      episode: r.episode,
      read: r.read,
      createdAt: r.createdAt.toISOString(),
    })),
    unreadCount,
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const WATCHING_STATUSES = ["WATCHING", "REWATCHING"] as const;

// GET /api/notifications/watching — the signed-in user's own Watching/
// Rewatching entries (anilistId + progress only). Our own DB, no AniList
// involved — the client uses this to know which shows to check against
// AniList's airing data itself; see notifications-client.ts.
export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const entries = await prisma.animeListEntry.findMany({
    where: { userId, status: { in: [...WATCHING_STATUSES] } },
    select: { anilistId: true, progress: true },
  });
  return NextResponse.json({ entries });
}

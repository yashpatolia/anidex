import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

// GET /api/list/raw — the signed-in user's list entries as-is, with no
// AniList hydration at all (contrast with GET /api/list, which merges in
// anime metadata). Our own AnimeListEntry table only. Used by client
// components (recommendations-client.ts) that need the raw status/score
// signal and will fetch AniList data themselves, directly, for whichever
// ids they actually need.
export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const entries = await prisma.animeListEntry.findMany({
    where: { userId },
    select: { anilistId: true, status: true, score: true },
  });
  return NextResponse.json({ entries });
}

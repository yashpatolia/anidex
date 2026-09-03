import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { deleteListEntryFromAnilist } from "@/lib/anilist-sync";

// GET /api/list/:anilistId — the signed-in user's own entry for one anime,
// or null if signed out or not tracked. Used by the client-fetched anime
// detail page (our own data only, no AniList involved) to show the
// existing status/score/progress in AddToListControl.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ anilistId: string }> },
) {
  const session = await auth();
  const anilistId = Number((await params).anilistId);
  if (!Number.isInteger(anilistId)) {
    return NextResponse.json({ error: "Invalid anime id" }, { status: 400 });
  }
  if (!session?.user) return NextResponse.json({ entry: null });

  const entry = await prisma.animeListEntry.findUnique({
    where: { userId_anilistId: { userId: session.user.id, anilistId } },
  });
  return NextResponse.json({ entry });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ anilistId: string }> },
) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const anilistId = Number((await params).anilistId);
  if (!Number.isInteger(anilistId)) {
    return NextResponse.json({ error: "Invalid anime id" }, { status: 400 });
  }

  await prisma.animeListEntry.deleteMany({ where: { userId, anilistId } });
  await deleteListEntryFromAnilist(userId, anilistId);
  return NextResponse.json({ ok: true });
}

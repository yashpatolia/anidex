import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { deleteListEntryFromAnilist } from "@/lib/anilist-sync";

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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

// DELETE /api/account — permanently delete the signed-in user and everything
// that cascades from it (Account/Session/Notification/Follow all have
// onDelete: Cascade in schema.prisma). Doesn't touch AniList itself — the
// user's real AniList list is untouched, only their AniDex account
// (profile, notifications, follows) goes away. Sessions here are JWT, not
// DB-backed, so the existing session cookie stays valid until it expires —
// the client is expected to call signOut() immediately after this succeeds.
export async function DELETE() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { getAnilistUserList } from "@/lib/anilist";
import { syncManyToAnilist } from "@/lib/anilist-sync";

// DELETE /api/list/clear — removes every entry from the signed-in user's
// real AniList list (not their AniDex account — see account-view.tsx's
// separate "Delete account" for that). Batched the same way import's bulk
// sync is (see anilist-sync.ts's syncManyToAnilist/batchDelete), so even a
// large list clears in a handful of requests — fast enough to await
// directly rather than run in the background like a big import does.
export async function DELETE() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!user?.name) return NextResponse.json({ error: "No linked AniList account." }, { status: 400 });

  const current = await getAnilistUserList(user.name);
  if (current.length === 0) return NextResponse.json({ deleted: 0 });

  const result = await syncManyToAnilist(userId, [], current.map((e) => e.anilistId));
  return NextResponse.json({ deleted: result.deleted, failed: result.failed });
}

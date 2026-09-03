import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { deleteListEntryFromAnilist } from "@/lib/anilist-sync";

// DELETE /api/list/:anilistId — remove the signed-in user's entry for one
// anime. Exists server-side only because the delete mutation needs the
// caller's own OAuth access token (see anilist-sync.ts) — there's no local
// row to also delete; AniList is the only copy (see anilist-client.ts's
// file comment). (The GET this route used to have — the signed-in user's
// current entry for one anime — is gone too: the anime detail page fetches
// that straight from AniList client-side now, via getUserMediaListEntry.)
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

  const ok = await deleteListEntryFromAnilist(userId, anilistId);
  if (!ok) return NextResponse.json({ error: "AniList sync failed. Try again." }, { status: 502 });

  return NextResponse.json({ ok: true });
}

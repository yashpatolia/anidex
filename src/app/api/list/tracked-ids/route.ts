import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTrackedAnilistIds } from "@/lib/list-status";

// GET /api/list/tracked-ids — just the signed-in user's own anilistIds,
// no AniList calls involved (list-status.ts's getTrackedAnilistIds only
// ever touches our own AnimeListEntry table). Client components that
// fetch AniList data directly (see anilist-client.ts) use this to know
// which cards should show as already-tracked, without the server ever
// needing to hydrate anime metadata itself. Signed-out visitors get an
// empty list rather than a 401 — Browse/Seasonal/etc. are all public.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ids: [] });

  const ids = await getTrackedAnilistIds(session.user.id);
  return NextResponse.json({ ids: [...ids] });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { getMalUserList, MalApiError } from "@/lib/mal";
import { resolveMalEntries } from "@/lib/import/resolve";
import { buildPreview } from "@/lib/import/preview";

const bodySchema = z.object({ username: z.string().trim().min(1).max(50) });

// POST /api/import/mal-account/preview — fetch a public MyAnimeList user's
// list directly via MAL's official API by username (no manual XML export
// needed), resolve to our ids the same way the XML upload path does, and
// cross-reference against the current user's existing list. Writes nothing.
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let entries;
  try {
    entries = await getMalUserList(parsed.data.username);
  } catch (err) {
    if (err instanceof MalApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status === 500 ? 500 : 400 });
    }
    return NextResponse.json(
      { error: "Couldn't fetch that MyAnimeList list. Check the username and that their list is public." },
      { status: 400 },
    );
  }

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "That user's MyAnimeList anime list is empty or private." },
      { status: 400 },
    );
  }

  // resolveMalEntries and buildPreview both make live AniList calls
  // (resolveMalEntries's title-search fallback runs one per unmatched
  // entry, sequentially) — a big MAL list means a lot of them from this
  // server's own IP, which anilist.ts's own comments flag as more prone
  // to rate-limiting/timeouts than a visitor's browser calling AniList
  // directly. Unguarded, a failure here threw straight out of the route
  // handler: Next renders its own HTML error page for that, the frontend's
  // res.json() then chokes on non-JSON and shows a generic message with no
  // way to tell what actually happened. Catch it and say so instead.
  try {
    const { resolved, unmatched } = await resolveMalEntries(entries);
    const preview = await buildPreview(userId, resolved);
    return NextResponse.json({ ...preview, unmatched });
  } catch {
    return NextResponse.json(
      { error: "AniList looked slow or rate-limited just now while matching up that list. Try again in a moment." },
      { status: 502 },
    );
  }
}

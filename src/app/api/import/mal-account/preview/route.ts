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

  const { resolved, unmatched } = await resolveMalEntries(entries);
  const preview = await buildPreview(userId, resolved);

  return NextResponse.json({ ...preview, unmatched });
}

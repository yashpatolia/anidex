import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { getAnilistUserList } from "@/lib/anilist";
import { resolveAnilistEntries } from "@/lib/import/resolve";
import { buildPreview } from "@/lib/import/preview";

const bodySchema = z.object({ username: z.string().trim().min(1).max(50) });

// POST /api/import/anilist/preview — fetch a public AniList user's list by
// username and cross-reference against the current user's existing list.
// Writes nothing.
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
    entries = await getAnilistUserList(parsed.data.username);
  } catch {
    return NextResponse.json(
      { error: "Couldn't fetch that AniList list. Check the username and that their list is public." },
      { status: 400 },
    );
  }

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "That user's AniList anime list is empty, private, or doesn't exist." },
      { status: 400 },
    );
  }

  const resolved = resolveAnilistEntries(entries);
  const preview = await buildPreview(userId, resolved);

  return NextResponse.json({ ...preview, unmatched: [] });
}

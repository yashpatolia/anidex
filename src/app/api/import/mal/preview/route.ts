import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { parseMalXml, MalParseError } from "@/lib/import/mal-parser";
import { resolveMalEntries } from "@/lib/import/resolve";
import { buildPreview } from "@/lib/import/preview";

const bodySchema = z.object({ xml: z.string().min(1).max(20_000_000) });

// POST /api/import/mal/preview — parse a MAL animelist.xml export, resolve
// each entry to our (AniList) id, and cross-reference against the current
// user's existing list. Writes nothing.
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
    entries = parseMalXml(parsed.data.xml);
  } catch (err) {
    if (err instanceof MalParseError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const { resolved, unmatched } = await resolveMalEntries(entries);
  const preview = await buildPreview(userId, resolved);

  return NextResponse.json({ ...preview, unmatched });
}

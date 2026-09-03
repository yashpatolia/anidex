import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { syncStatusOnlyToAnilist } from "@/lib/anilist-sync";

const bodySchema = z.object({
  anilistId: z.number().int().positive(),
  status: z.enum(["WATCHING", "COMPLETED", "PLANNED", "PAUSED", "DROPPED"]).default("PLANNED"),
});

// POST /api/list/quick-add — set which status list this anime belongs to,
// from a one-click menu on a card (no detail-page visit needed). Unlike
// POST /api/list (the detail page's full editor, which legitimately
// overwrites status/score/progress together when the user edits all three),
// this only ever touches `status` — syncStatusOnlyToAnilist omits
// score/progress from the mutation entirely rather than trying to read and
// re-send whatever they already are (there's no local copy to read them
// from anyway; see anilist-sync.ts).
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { anilistId, status } = parsed.data;

  const ok = await syncStatusOnlyToAnilist(userId, anilistId, status);
  if (!ok) return NextResponse.json({ error: "AniList sync failed. Try again." }, { status: 502 });

  return NextResponse.json({ ok: true });
}

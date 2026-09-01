import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const bodySchema = z.object({
  anilistId: z.number().int().positive(),
  status: z.enum(["WATCHING", "COMPLETED", "PLANNED", "PAUSED", "DROPPED"]).default("PLANNED"),
});

// POST /api/list/quick-add — set which status list this anime belongs to,
// from a one-click menu on a card (no detail-page visit needed). Unlike
// POST /api/list (the detail page's full editor, which legitimately
// overwrites status/score/progress together when the user edits all three),
// this only ever touches `status`. A quick-add menu has no idea an anime
// might already be tracked with real score/progress, so recategorizing it
// must never be able to wipe that out.
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { anilistId, status } = parsed.data;

  const entry = await prisma.animeListEntry.upsert({
    where: { userId_anilistId: { userId, anilistId } },
    create: { userId, anilistId, status },
    update: { status }, // status only — score/progress/notes stay whatever they already were
  });

  return NextResponse.json(entry);
}

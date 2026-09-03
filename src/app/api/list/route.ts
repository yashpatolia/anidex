import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { syncListEntryToAnilist } from "@/lib/anilist-sync";
import { WATCH_STATUSES } from "@/lib/anilist-shared";

const upsertSchema = z.object({
  anilistId: z.number().int().positive(),
  status: z.enum(WATCH_STATUSES).default("PLANNED"),
  score: z.number().int().min(1).max(10).nullable().optional(),
  progress: z.number().int().min(0).default(0),
});

// POST /api/list — add or update the signed-in user's entry for an anime.
// AniList is the only place this data lives now (see anilist-client.ts's
// file comment) — this route exists at all only because *writing*
// AniList needs the caller's own OAuth access token, which never leaves
// the server (see anilist-sync.ts). There's nothing left to read here:
// Profile/detail pages fetch the current state straight from AniList
// client-side themselves.
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { anilistId, status, score, progress } = parsed.data;

  const ok = await syncListEntryToAnilist(userId, anilistId, { status, score: score ?? null, progress });
  if (!ok) return NextResponse.json({ error: "AniList sync failed. Try again." }, { status: 502 });

  return NextResponse.json({ ok: true });
}

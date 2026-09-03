import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const bodySchema = z.object({
  rows: z.array(z.object({ anilistId: z.number().int().positive(), episode: z.number().int().positive() })),
});

// POST /api/notifications/sync — persists newly-aired-episode rows the
// client computed itself (fetched the user's Watching/Rewatching list live
// from AniList, then checked AniList's nextAiringEpisode for each — see
// notifications-client.ts). Trusted as-is, not re-checked against a local
// Watching list here — there's no local list left to check it against,
// AniList is the only copy now (see anilist-client.ts's file comment). A
// malicious payload could at worst spam a user's *own* notification feed
// with rows for anime they don't actually have Watching, not affect
// anyone else's data — scoped to the caller's own userId either way. The
// (userId, anilistId, episode) unique constraint (see schema.prisma) makes
// this safe to call repeatedly with overlapping rows.
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.rows.length === 0) return NextResponse.json({ ok: true });

  const rows = parsed.data.rows.map((r) => ({ userId, anilistId: r.anilistId, episode: r.episode }));
  await prisma.notification.createMany({ data: rows, skipDuplicates: true });
  return NextResponse.json({ ok: true });
}

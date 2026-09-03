import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const bodySchema = z.object({
  rows: z.array(z.object({ anilistId: z.number().int().positive(), episode: z.number().int().positive() })),
});

// POST /api/notifications/sync — persists newly-aired-episode rows the
// client computed itself (fetched the user's Watching/Rewatching list from
// /api/notifications/watching, then checked AniList's nextAiringEpisode for
// each — see notifications-client.ts). Only ever writes rows for anime the
// caller actually has Watching/Rewatching, re-checked here rather than
// trusted blindly from the client body — a malicious payload could at
// worst spam a user's *own* notification feed for shows already on their
// own list, not affect anyone else's data, but there's no reason not to
// bound it. The (userId, anilistId, episode) unique constraint (see
// schema.prisma) makes this safe to call repeatedly with overlapping rows.
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.rows.length === 0) return NextResponse.json({ ok: true });

  const watching = await prisma.animeListEntry.findMany({
    where: {
      userId,
      status: { in: ["WATCHING", "REWATCHING"] },
      anilistId: { in: parsed.data.rows.map((r) => r.anilistId) },
    },
    select: { anilistId: true },
  });
  const watchingIds = new Set(watching.map((w) => w.anilistId));

  const rows = parsed.data.rows
    .filter((r) => watchingIds.has(r.anilistId))
    .map((r) => ({ userId, anilistId: r.anilistId, episode: r.episode }));
  if (rows.length === 0) return NextResponse.json({ ok: true });

  await prisma.notification.createMany({ data: rows, skipDuplicates: true });
  return NextResponse.json({ ok: true });
}

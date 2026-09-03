import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { getAnilistUserList } from "@/lib/anilist";
import { syncManyToAnilist } from "@/lib/anilist-sync";
import { WATCH_STATUSES } from "@/lib/anilist-shared";

const bodySchema = z.object({
  entries: z
    .array(
      z.object({
        anilistId: z.number().int().positive(),
        status: z.enum(WATCH_STATUSES),
        score: z.number().int().min(1).max(10).nullable(),
        progress: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(10_000),
  // skipExisting (default): only push entries for anime not already on the
  // user's real AniList list — an import can never silently overwrite an
  // existing score/progress there.
  // overwriteExisting: push every entry in this import, including ones
  // already on AniList (their score/progress there gets replaced), but
  // never touches anything the import doesn't mention.
  // replaceAll: overwriteExisting's behavior, PLUS deletes every entry
  // already on AniList that isn't in this import — the only mode where the
  // result becomes an exact copy of the imported list. Destructive; the UI
  // requires an explicit confirmation before sending this.
  mode: z.enum(["skipExisting", "overwriteExisting", "replaceAll"]).default("skipExisting"),
});

// POST /api/import/commit — push a previously-previewed set of entries to
// the signed-in user's real AniList account. AniList is the only place
// list data lives now (see anilist-client.ts's file comment), so unlike
// the old version of this route there's no local write at all — this is
// purely a bulk call into anilist-sync.ts, which is also why it lives
// server-side (a write needs the caller's own OAuth access token).
//
// Not awaited to completion: syncManyToAnilist pushes one mutation roughly
// every 2 seconds (see anilist-sync.ts's throttling) to stay under
// AniList's rate limit, so a large import (hundreds of entries) can take
// several minutes — long enough that holding the HTTP request open for it
// would be a bad idea (proxy/browser timeouts, a UI stuck spinning). This
// process is self-hosted and persistent (not serverless), so the fire-and-
// forget call below keeps running after the response is sent — see
// src/app/api/list/route.ts's older version of this same reasoning. A
// half-finished import on a server restart is a real, accepted gap for
// now: nothing tracks or resumes a partial batch.
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { entries, mode } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!user?.name) return NextResponse.json({ error: "No linked AniList account." }, { status: 400 });

  const current = await getAnilistUserList(user.name);
  const currentIds = new Set(current.map((e) => e.anilistId));

  const toWrite = mode === "skipExisting" ? entries.filter((e) => !currentIds.has(e.anilistId)) : entries;
  const toDelete =
    mode === "replaceAll"
      ? current.map((e) => e.anilistId).filter((id) => !entries.some((e) => e.anilistId === id))
      : [];

  const queued = toWrite.length + toDelete.length;
  if (queued === 0) {
    return NextResponse.json({ queued: 0, skipped: entries.length });
  }

  // See file comment — deliberately not awaited.
  void syncManyToAnilist(userId, toWrite, toDelete).then((result) => {
    console.log(`Import sync finished for user ${userId}:`, result);
  });

  return NextResponse.json({ queued, skipped: entries.length - toWrite.length });
}

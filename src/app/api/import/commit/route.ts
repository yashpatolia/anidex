import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { WatchStatus } from "@/generated/prisma/client";

const bodySchema = z.object({
  entries: z
    .array(
      z.object({
        anilistId: z.number().int().positive(),
        status: z.enum(WatchStatus),
        score: z.number().int().min(1).max(10).nullable(),
        progress: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(10_000),
  // Default (false): only create entries for anime not already tracked, so
  // an import can never silently overwrite a user's existing score/progress
  // — same non-destructive principle as quick-add. Set true to let the
  // imported source's data replace what's already there.
  overwriteExisting: z.boolean().default(false),
});

// POST /api/import/commit — write a previously-previewed set of entries.
// Takes the already-resolved rows from a preview call, not raw file/username
// input, so this route doesn't need to redo any parsing or AniList lookups.
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { entries, overwriteExisting } = parsed.data;

  const existing = await prisma.animeListEntry.findMany({
    where: { userId, anilistId: { in: entries.map((e) => e.anilistId) } },
    select: { anilistId: true },
  });
  const existingIds = new Set(existing.map((e) => e.anilistId));

  const toWrite = overwriteExisting ? entries : entries.filter((e) => !existingIds.has(e.anilistId));

  let created = 0;
  let updated = 0;
  for (const entry of toWrite) {
    const isNew = !existingIds.has(entry.anilistId);
    await prisma.animeListEntry.upsert({
      where: { userId_anilistId: { userId, anilistId: entry.anilistId } },
      create: { userId, ...entry },
      update: { status: entry.status, score: entry.score, progress: entry.progress },
    });
    if (isNew) created++;
    else updated++;
  }

  return NextResponse.json({ created, updated, skipped: entries.length - toWrite.length });
}

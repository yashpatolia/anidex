import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { syncListEntryToAnilist } from "@/lib/anilist-sync";
import { WatchStatus } from "@/generated/prisma/client";

const upsertSchema = z.object({
  anilistId: z.number().int().positive(),
  status: z.enum(WatchStatus).default(WatchStatus.PLANNED),
  score: z.number().int().min(1).max(10).nullable().optional(),
  progress: z.number().int().min(0).default(0),
  notes: z.string().max(2000).nullable().optional(),
});

// POST /api/list — add or update the current user's entry for an anime.
// (The old GET here — the user's list merged with hydrated AniList data —
// is gone: nothing calls it anymore now that Profile/list pages fetch
// their own raw entries server-side and hydrate AniList data client-side
// themselves; see profile-data-view.tsx.)
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { anilistId, status, score, progress, notes } = parsed.data;

  const entry = await prisma.animeListEntry.upsert({
    where: { userId_anilistId: { userId, anilistId } },
    update: { status, score, progress, notes },
    create: { userId, anilistId, status, score, progress, notes },
  });

  // Awaited (not fire-and-forget) so it actually runs to completion on
  // this self-hosted, persistent Node process rather than racing the
  // response — but never blocks or fails the *local* write: a failed
  // AniList sync is caught and logged inside syncListEntryToAnilist
  // itself (AniDex's DB stays the source of truth this app reads from), a
  // real but separate reliability gap for now, not something that should
  // roll back a successful local save.
  await syncListEntryToAnilist(userId, anilistId, { status, score: score ?? null, progress });

  return NextResponse.json(entry);
}

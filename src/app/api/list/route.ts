import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { getAnimeByIds } from "@/lib/anilist";
import { WatchStatus } from "@/generated/prisma/client";

const upsertSchema = z.object({
  anilistId: z.number().int().positive(),
  status: z.enum(WatchStatus).default(WatchStatus.PLANNED),
  score: z.number().int().min(1).max(10).nullable().optional(),
  progress: z.number().int().min(0).default(0),
  notes: z.string().max(2000).nullable().optional(),
});

// GET /api/list?status=WATCHING — current user's list, merged with live AniList metadata.
export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const status = new URL(req.url).searchParams.get("status");
  const parsedStatus = status && status in WatchStatus ? (status as WatchStatus) : undefined;

  const entries = await prisma.animeListEntry.findMany({
    where: { userId, ...(parsedStatus ? { status: parsedStatus } : {}) },
    orderBy: { updatedAt: "desc" },
  });

  const media = await getAnimeByIds(entries.map((e) => e.anilistId));
  const mediaById = new Map(media.map((m) => [m.id, m]));

  return NextResponse.json(
    entries.map((entry) => ({ ...entry, anime: mediaById.get(entry.anilistId) ?? null })),
  );
}

// POST /api/list — add or update the current user's entry for an anime.
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

  return NextResponse.json(entry);
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { MAX_FAVORITES } from "@/lib/profile-prefs";

const sectionSchema = z.object({
  key: z.enum(["WATCHING", "COMPLETED", "PLANNED", "PAUSED", "DROPPED"]),
  visible: z.boolean(),
});

const prefsSchema = z.object({
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  sections: z.array(sectionSchema).min(1),
  stats: z.object({
    total: z.boolean(),
    episodes: z.boolean(),
    avgScore: z.boolean(),
    genres: z.boolean(),
  }),
  isPublic: z.boolean(),
  headerStyle: z.enum(["compact", "banner"]),
  bannerAnilistId: z.number().int().nullable(),
  favoriteIds: z.array(z.number().int()).max(MAX_FAVORITES),
});

const bodySchema = z.object({
  bio: z.string().trim().max(280).nullable().optional(),
  profilePrefs: prefsSchema.optional(),
});

export async function PATCH(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { profilePrefs, ...rest } = parsed.data;

  // A banner or favorite pointing at something not actually on the owner's
  // list would just be a broken picture (there'd be nothing to look up), so
  // silently drop anything that doesn't check out rather than erroring —
  // the client already only offers picks from the owner's own entries.
  let cleanedPrefs = profilePrefs;
  if (profilePrefs) {
    const candidateIds = [
      ...(profilePrefs.bannerAnilistId != null ? [profilePrefs.bannerAnilistId] : []),
      ...profilePrefs.favoriteIds,
    ];
    const owned = candidateIds.length
      ? new Set(
          (
            await prisma.animeListEntry.findMany({
              where: { userId, anilistId: { in: candidateIds } },
              select: { anilistId: true },
            })
          ).map((e) => e.anilistId),
        )
      : new Set<number>();
    cleanedPrefs = {
      ...profilePrefs,
      bannerAnilistId:
        profilePrefs.bannerAnilistId != null && owned.has(profilePrefs.bannerAnilistId)
          ? profilePrefs.bannerAnilistId
          : null,
      favoriteIds: profilePrefs.favoriteIds.filter((id) => owned.has(id)),
    };
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { ...rest, profilePrefs: cleanedPrefs },
  });
  return NextResponse.json({
    bio: user.bio,
    username: user.username,
    profilePrefs: user.profilePrefs,
  });
}

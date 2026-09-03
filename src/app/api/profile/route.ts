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

// No server-side "is this actually on your AniList list" check on
// bannerAnilistId/favoriteIds anymore (there used to be one, calling
// src/lib/anilist.ts's getAnilistUserList) — dropped after it turned out
// to be the slow/unreliable part of this route in production: requests
// from this server's own IP to AniList appear to hit something (Cloudflare,
// most likely) that's much slower and occasionally non-JSON compared to a
// visitor's browser calling AniList directly, and profile saves were
// hanging or crashing because of it. The client-side picker
// (profile-customize-panel.tsx) already only offers choices from the
// owner's own entries, so the worst case of trusting it here is a banner/
// favorite pointing at something not actually tracked - a broken image,
// not a security issue - which isn't worth this reliability cost.
export async function PATCH(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { profilePrefs, ...rest } = parsed.data;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { ...rest, profilePrefs },
  });
  return NextResponse.json({
    bio: user.bio,
    username: user.username,
    profilePrefs: user.profilePrefs,
  });
}

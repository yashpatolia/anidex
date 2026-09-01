import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { USERNAME_PATTERN } from "@/lib/username";
import { Prisma } from "@/generated/prisma/client";

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
});

const bodySchema = z.object({
  name: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(280).nullable().optional(),
  username: z.string().regex(USERNAME_PATTERN, "4-24 characters: lowercase letters, numbers, underscore.").optional(),
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
  const { username, ...rest } = parsed.data;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      // Explicitly setting a username (vs. the one auto-generated at
      // signup/backfill) turns off the "pick your own" nudge for good.
      data: username != null ? { ...rest, username, usernameAutoAssigned: false } : rest,
    });
    return NextResponse.json({
      name: user.name,
      bio: user.bio,
      username: user.username,
      usernameAutoAssigned: user.usernameAutoAssigned,
      profilePrefs: user.profilePrefs,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    }
    throw e;
  }
}

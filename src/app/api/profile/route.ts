import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

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

  const user = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
  });

  return NextResponse.json({ name: user.name, bio: user.bio, profilePrefs: user.profilePrefs });
}

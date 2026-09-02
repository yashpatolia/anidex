import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

// Resized/compressed client-side to a small square before it ever gets
// here (see src/components/avatar-upload.tsx) — this cap is just defense
// in depth against a client that skips that step, not the primary limit.
const MAX_DATA_URL_LENGTH = 500_000;
const DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,/;

const bodySchema = z.object({
  image: z.string().regex(DATA_URL_PATTERN, "Must be a PNG, JPEG, or WebP image.").max(MAX_DATA_URL_LENGTH),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: { avatarImage: parsed.data.image } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  await prisma.user.update({ where: { id: userId }, data: { avatarImage: null } });
  return NextResponse.json({ ok: true });
}

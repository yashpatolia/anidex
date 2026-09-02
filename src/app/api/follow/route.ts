import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { normalizePrefs } from "@/lib/profile-prefs";
import { followUser, unfollowUser } from "@/lib/follows";

const bodySchema = z.object({ username: z.string() });

// Looks up the target the same way findPublicUser does (src/app/u/[username]/
// page.tsx) so following is only ever possible on a profile that's actually
// visitable — a private or nonexistent username both come back as "not
// found" here too, no distinction leaked.
async function resolvePublicUserId(username: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, profilePrefs: true },
  });
  if (!user) return null;
  return normalizePrefs(user.profilePrefs).isPublic ? user.id : null;
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const targetId = await resolvePublicUserId(parsed.data.username);
  if (!targetId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (targetId === userId) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  await followUser(userId, targetId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const targetId = await resolvePublicUserId(parsed.data.username);
  if (!targetId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await unfollowUser(userId, targetId);
  return NextResponse.json({ ok: true });
}

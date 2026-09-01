import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const bodySchema = z.object({
  // Required to change an existing password, omitted when setting one for
  // the first time (Google-only accounts have no passwordHash to check
  // against — the authenticated session itself is the trust boundary there).
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).max(200),
});

// POST /api/account/password — set or change a credentials (email/
// password) sign-in for the current account. If the account already has a
// passwordHash, currentPassword must match it. If it doesn't (an
// OAuth-only account, e.g. signed in via Google), this adds a password as
// an additional sign-in method — no currentPassword needed since there's
// nothing to verify against; the request is already authenticated.
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });

  if (user?.passwordHash) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
  name: z.string().trim().max(60).optional(),
});

// POST /api/auth/register — real email/password signup. Creates the User
// row directly (no email verification yet); the client signs the user in
// via the Credentials provider right after this succeeds.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { passwordHash: true } });
  if (existing) {
    // Don't silently attach a password to an OAuth account here — that
    // would let anyone who merely knows a Google user's email address take
    // over the account by "registering" it. Signing in with Google first
    // (Google already verified the email) is the trusted path to adding a
    // password, via Account settings.
    const message = existing.passwordHash
      ? "An account with this email already exists. Sign in instead."
      : "This email already signs in with Google. Sign in with Google, then set a password from Account settings.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, passwordHash, name } });

  return NextResponse.json({ ok: true });
}

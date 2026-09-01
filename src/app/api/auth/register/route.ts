import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { USERNAME_PATTERN } from "@/lib/username";

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
  username: z.string().regex(USERNAME_PATTERN, "4-24 characters: lowercase letters, numbers, underscore."),
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
  const { email, password, username, name } = parsed.data;

  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { passwordHash: true } }),
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
  ]);
  if (existingEmail) {
    // Don't silently attach a password to an OAuth account here — that
    // would let anyone who merely knows a Google user's email address take
    // over the account by "registering" it. Signing in with Google first
    // (Google already verified the email) is the trusted path to adding a
    // password, via Account settings.
    const message = existingEmail.passwordHash
      ? "An account with this email already exists. Sign in instead."
      : "This email already signs in with Google. Sign in with Google, then set a password from Account settings.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
  if (existingUsername) {
    return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, passwordHash, username, name } });

  return NextResponse.json({ ok: true });
}

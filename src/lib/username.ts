import type { PrismaClient } from "@/generated/prisma/client";

// >=4 chars (per product decision), lowercase letters/digits/underscore only
// — keeps it URL-safe for the eventual /u/[username] public profile route
// with no encoding concerns.
export const USERNAME_PATTERN = /^[a-z0-9_]{4,24}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

// Turns arbitrary input (an email local-part, a display name, anything)
// into a candidate username: lowercase, strip to the allowed charset, pad
// short ones so they clear the 4-char minimum. Doesn't guarantee
// uniqueness — see generateUniqueUsername for that.
export function sanitizeUsernameSeed(seed: string): string {
  const cleaned = seed
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
  const padded = cleaned.padEnd(4, "0");
  return padded || "user";
}

// Generates a username guaranteed not to collide with an existing row,
// starting from a human-meaningful seed (email local-part, display name)
// and falling back to a numeric suffix (2, 3, ...) on collision. Used for
// backfilling pre-existing accounts and for auto-assigning new Google
// sign-ups, which don't go through a form where the user picks their own.
export async function generateUniqueUsername(
  prisma: Pick<PrismaClient, "user">,
  seed: string,
): Promise<string> {
  const base = sanitizeUsernameSeed(seed);
  let candidate = base;
  let suffix = 2;
  // Bounded: even a pathological amount of collisions on one base resolves
  // within a handful of tries in practice, and this only ever runs at
  // signup/backfill time, not on a hot path.
  while (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
    const suffixStr = String(suffix);
    candidate = `${base.slice(0, 24 - suffixStr.length)}${suffixStr}`;
    suffix++;
  }
  return candidate;
}

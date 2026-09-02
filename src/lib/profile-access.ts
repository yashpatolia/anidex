// Shared by every /u/[username]/* page (the list itself, and the
// followers/following pages) — one place that decides who can see a
// profile, so that decision can't drift between them.
//
// A private profile is visible only to the account it belongs to —
// everyone else gets exactly the same "not found" as a username that
// doesn't exist at all, same principle as not leaking registered-email
// existence elsewhere in this app. That's why this needs the viewer's id
// *before* deciding what to return, unlike a plain public-only lookup.
import { prisma } from "@/lib/prisma";
import { normalizePrefs, type ProfilePrefs } from "@/lib/profile-prefs";

export type ProfileAccess = {
  id: string;
  username: string;
  bio: string | null;
  prefs: ProfilePrefs;
  isOwner: boolean;
};

export async function resolveProfileAccess(
  username: string,
  viewerId: string | undefined,
): Promise<ProfileAccess | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, bio: true, profilePrefs: true },
  });
  if (!user) return null;
  const prefs = normalizePrefs(user.profilePrefs);
  const isOwner = viewerId === user.id;
  if (!prefs.isPublic && !isOwner) return null;
  return { id: user.id, username: user.username!, bio: user.bio, prefs, isOwner };
}

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
  // The AniList account this profile's list actually reads from (User.name
  // — see auth.ts's profile() mapping). Not necessarily identical to
  // `username` above (that's sanitized/deduped for our own URL charset).
  // Null only for a row that somehow lost its AniList Account link.
  anilistUsername: string | null;
  bio: string | null;
  // Resolved display picture: the user's own upload if they have one,
  // else the OAuth-provided picture, else null (Avatar renders a
  // generated fallback for null — see src/components/avatar.tsx).
  avatarSrc: string | null;
  prefs: ProfilePrefs;
  isOwner: boolean;
};

export async function resolveProfileAccess(
  username: string,
  viewerId: string | undefined,
): Promise<ProfileAccess | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      image: true,
      avatarImage: true,
      profilePrefs: true,
      accounts: { where: { provider: "anilist" }, select: { provider: true } },
    },
  });
  if (!user) return null;
  const prefs = normalizePrefs(user.profilePrefs);
  const isOwner = viewerId === user.id;
  if (!prefs.isPublic && !isOwner) return null;
  return {
    id: user.id,
    username: user.username!,
    anilistUsername: user.accounts.length > 0 ? user.name : null,
    bio: user.bio,
    avatarSrc: user.avatarImage ?? user.image,
    prefs,
    isOwner,
  };
}

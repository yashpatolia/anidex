// Follow relationships. Restricted to public profiles by the API route
// (src/app/api/follow/route.ts), not here — this module trusts its callers,
// same division of responsibility as src/lib/notifications.ts trusting its
// route to have already resolved the signed-in user.
//
// Server-only: imports Prisma directly.
import { prisma } from "@/lib/prisma";
import { normalizePrefs } from "@/lib/profile-prefs";

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);
  return { followers, following };
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const row = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
    select: { id: true },
  });
  return row != null;
}

export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) throw new Error("Cannot follow yourself");
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId } },
    create: { followerId, followingId },
    update: {},
  });
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  await prisma.follow.deleteMany({ where: { followerId, followingId } });
}

export type FollowListEntry = { username: string; isPublic: boolean };

// Only used to render a list of names on a profile page — link to whichever
// of these actually have a public profile to visit; the rest render as
// plain (unlinked) text, since /u/[username] 404s for anyone else.
async function hydrateFollowList(userIds: string[]): Promise<FollowListEntry[]> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { username: true, profilePrefs: true },
  });
  return users
    .filter((u) => u.username != null)
    .map((u) => ({ username: u.username!, isPublic: normalizePrefs(u.profilePrefs).isPublic }));
}

export async function getFollowers(userId: string, limit = 200): Promise<FollowListEntry[]> {
  const rows = await prisma.follow.findMany({
    where: { followingId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { followerId: true },
  });
  return hydrateFollowList(rows.map((r) => r.followerId));
}

export async function getFollowing(userId: string, limit = 200): Promise<FollowListEntry[]> {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { followingId: true },
  });
  return hydrateFollowList(rows.map((r) => r.followingId));
}

// The signed-in viewer's own following set, keyed by username — used to
// render a per-row Follow/Following button on a list of other users (search
// results, someone's followers/following page) without one query per row.
export async function getViewerFollowingUsernames(viewerId: string): Promise<Set<string>> {
  const rows = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { following: { select: { username: true } } },
  });
  return new Set(rows.map((r) => r.following.username).filter((u): u is string => u != null));
}

export type UserSearchResult = { username: string; bio: string | null; isFollowing: boolean };

// Public profiles only, matching src/app/api/follow/route.ts's own gating —
// searching up someone whose profile is private would just lead to a 404,
// so there's nothing useful to show for them here either. `viewerId` is
// optional — signed-out visitors can still search (public profiles are
// visible to anyone), they just never see `isFollowing: true`.
export async function searchPublicUsers(
  query: string,
  viewerId?: string,
  limit = 20,
): Promise<UserSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const [users, followingUsernames] = await Promise.all([
    prisma.user.findMany({
      where: {
        username: { startsWith: q.toLowerCase() },
        NOT: viewerId ? { id: viewerId } : undefined,
      },
      select: { username: true, bio: true, profilePrefs: true },
      take: limit * 2, // isPublic isn't stored as its own filterable column (see profilePrefs' JSON shape note in schema.prisma), so over-fetch and filter in JS
    }),
    viewerId ? getViewerFollowingUsernames(viewerId) : Promise.resolve(new Set<string>()),
  ]);
  return users
    .filter((u) => u.username != null && normalizePrefs(u.profilePrefs).isPublic)
    .slice(0, limit)
    .map((u) => ({ username: u.username!, bio: u.bio, isFollowing: followingUsernames.has(u.username!) }));
}

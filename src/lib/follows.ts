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

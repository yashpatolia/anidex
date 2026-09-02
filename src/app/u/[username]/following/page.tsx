import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveProfileAccess } from "@/lib/profile-access";
import { getFollowing, getViewerFollowingUsernames } from "@/lib/follows";
import { FollowListPage } from "@/components/follow-list-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const session = await auth();
  const user = await resolveProfileAccess(username, session?.user?.id);
  return { title: user ? `Who ${user.username} follows` : "Profile" };
}

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();
  const viewerId = session?.user?.id;

  const user = await resolveProfileAccess(username, viewerId);
  if (!user) notFound();

  const [rows, viewer] = await Promise.all([
    getFollowing(user.id),
    viewerId
      ? prisma.user.findUnique({ where: { id: viewerId }, select: { username: true } })
      : Promise.resolve(null),
  ]);
  const viewerFollowingUsernames = viewerId ? await getViewerFollowingUsernames(viewerId) : new Set<string>();

  return (
    <FollowListPage
      title={`Who ${user.username} follows`}
      backHref={`/u/${user.username}`}
      rows={rows}
      viewerUsername={viewer?.username ?? undefined}
      viewerFollowingUsernames={viewerFollowingUsernames}
    />
  );
}

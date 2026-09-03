import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTrackedAnilistIds } from "@/lib/list-status";
import { resolveProfileAccess } from "@/lib/profile-access";
import { getFollowCounts, isFollowing } from "@/lib/follows";
import { ProfileDataView } from "@/components/profile-data-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const session = await auth();
  const user = await resolveProfileAccess(username, session?.user?.id);
  if (!user) return { title: "Profile" };

  const title = `${user.username}'s list`;
  const description = user.bio?.replace(/\s+/g, " ").trim() || undefined;
  const image = user.avatarSrc?.startsWith("http") ? user.avatarSrc : "/opengraph-image";

  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

// Only the AniList hydration + stats computation moved client-side (see
// profile-data-view.tsx) — everything here is still our own data
// (access/privacy, bio, avatar, prefs, follow state, the raw list entries
// themselves), so it stays exactly where it was.
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();
  const viewerId = session?.user?.id;

  const user = await resolveProfileAccess(username, viewerId);
  if (!user) notFound();

  const [entries, followCounts] = await Promise.all([
    prisma.animeListEntry.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    getFollowCounts(user.id),
  ]);

  const emptyOwnerState = (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-8 text-center">
      <h1 className="font-display text-3xl text-paper">Nothing tracked yet.</h1>
      <p className="text-sm text-ash">
        Search for something you&apos;re watching, or browse what&apos;s trending, and add
        it to your list. Already tracking one elsewhere?{" "}
        <Link href="/import" className="text-paper underline underline-offset-2 hover:text-hanko">
          Import it
        </Link>
        .
      </p>
      <Link
        href="/browse"
        className="mt-2 border border-hanko bg-hanko px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
      >
        Browse anime
      </Link>
    </main>
  );

  // The viewer's own tracked anime (not this page's owner's — those are
  // exactly what's already being rendered above), so quick-add on this page
  // reflects whether *you*, the visitor, already have something tracked.
  // Irrelevant (and skipped) when the viewer is the owner — their cards are
  // always tracked.
  const viewerTrackedIds = viewerId && !user.isOwner ? await getTrackedAnilistIds(viewerId) : new Set<number>();
  const viewerIsFollowing = viewerId && !user.isOwner ? await isFollowing(viewerId, user.id) : false;

  return (
    <ProfileDataView
      username={user.username}
      bio={user.bio}
      avatarSrc={user.avatarSrc}
      prefs={user.prefs}
      rawEntries={entries}
      isOwner={user.isOwner}
      viewerTrackedIds={[...viewerTrackedIds]}
      follow={{
        counts: followCounts,
        showButton: Boolean(viewerId) && !user.isOwner,
        viewerIsFollowing,
      }}
      emptyOwnerState={emptyOwnerState}
    />
  );
}

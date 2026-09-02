import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedAnimeCardsByIds } from "@/lib/anime-cache";
import { getTrackedAnilistIds } from "@/lib/list-status";
import { resolveProfileAccess } from "@/lib/profile-access";
import { getFollowCounts, isFollowing } from "@/lib/follows";
import { ProfilePageView } from "@/components/profile-page-view";

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
  // Collapsed to one line for the meta description — the bio itself still
  // renders with real line breaks on the page (see ProfilePageView), this
  // is only the link-preview summary.
  const description = user.bio?.replace(/\s+/g, " ").trim() || undefined;
  // Their avatar if they have one *and* it's a real fetchable URL —
  // link-preview crawlers (Discord, Twitter, ...) fetch og:image over
  // HTTP, they can't render an inline data: URI. A custom-uploaded
  // avatar is stored as a data: URI (see prisma/schema.prisma's
  // avatarImage comment), so it's skipped here even though it's shown
  // fine on the page itself, which just puts it in an <img src>.
  //
  // Falls back to the site-wide default image (src/app/opengraph-image.tsx)
  // by its own URL, spelled out explicitly rather than left to inherit —
  // Next's file-convention image is only auto-injected for a route that
  // doesn't otherwise return its own `openGraph`, and this one does.
  const image = user.avatarSrc?.startsWith("http") ? user.avatarSrc : "/opengraph-image";

  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();
  const viewerId = session?.user?.id;

  // Cheap, indexed lookup first, so a private or nonexistent username both
  // fall through to notFound() without ever fetching AniList data.
  const user = await resolveProfileAccess(username, viewerId);
  if (!user) notFound();

  const [entries, followCounts] = await Promise.all([
    prisma.animeListEntry.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    getFollowCounts(user.id),
  ]);

  if (user.isOwner && entries.length === 0) {
    return (
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
  }

  const media = await getCachedAnimeCardsByIds(entries.map((e) => e.anilistId));
  const mediaById = new Map(media.map((m) => [m.id, m]));

  const listEntries = entries
    .map((e) => {
      const anime = mediaById.get(e.anilistId);
      if (!anime) return null;
      return {
        id: e.id,
        status: e.status,
        score: e.score,
        progress: e.progress,
        anime,
      };
    })
    .filter((e) => e !== null);

  const episodesWatched = entries.reduce((sum, e) => sum + e.progress, 0);
  const scored = entries.filter((e) => e.score != null);
  const avgScore = scored.length
    ? (scored.reduce((sum, e) => sum + (e.score ?? 0), 0) / scored.length).toFixed(1)
    : null;

  const genreCounts = new Map<string, number>();
  for (const entry of listEntries) {
    for (const genre of entry.anime.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // The viewer's own tracked anime (not this page's owner's — those are
  // exactly what's already being rendered above), so quick-add on this page
  // reflects whether *you*, the visitor, already have something tracked.
  // Irrelevant (and skipped) when the viewer is the owner — their cards are
  // always tracked.
  const viewerTrackedIds = viewerId && !user.isOwner ? await getTrackedAnilistIds(viewerId) : new Set<number>();
  const viewerIsFollowing = viewerId && !user.isOwner ? await isFollowing(viewerId, user.id) : false;

  return (
    <ProfilePageView
      username={user.username}
      bio={user.bio}
      avatarSrc={user.avatarSrc}
      prefs={user.prefs}
      entries={listEntries}
      stats={{ total: entries.length, episodesWatched, avgScore, topGenres }}
      isOwner={user.isOwner}
      viewerTrackedIds={viewerTrackedIds}
      follow={{
        counts: followCounts,
        showButton: Boolean(viewerId) && !user.isOwner,
        viewerIsFollowing,
      }}
    />
  );
}

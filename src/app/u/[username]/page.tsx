import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedAnimeCardsByIds } from "@/lib/anime-cache";
import { getTrackedAnilistIds } from "@/lib/list-status";
import { normalizePrefs } from "@/lib/profile-prefs";
import { PublicProfileView } from "@/components/public-profile-view";

async function findPublicUser(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { username: true, bio: true, profilePrefs: true, id: true },
  });
  if (!user) return null;
  const prefs = normalizePrefs(user.profilePrefs);
  if (!prefs.isPublic) return null;
  return { ...user, prefs };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await findPublicUser(username);
  return { title: user ? `${user.username}'s list` : "Profile" };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  // findUnique on the raw param first (cheap, indexed) so a private or
  // nonexistent username both fall through to notFound() without ever
  // fetching AniList data — no reason to distinguish "doesn't exist" from
  // "exists but private" to a visitor, same principle as not leaking
  // registered-email existence elsewhere in this app.
  const user = await findPublicUser(username);
  if (!user) notFound();

  const [session, entries] = await Promise.all([
    auth(),
    prisma.animeListEntry.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

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

  // The viewer's own tracked anime (not the profile owner's — those are
  // exactly what's already being rendered above), so quick-add on this page
  // reflects whether *you*, the visitor, already have something tracked.
  const viewerTrackedIds = session?.user ? await getTrackedAnilistIds(session.user.id) : new Set<number>();

  return (
    <PublicProfileView
      username={user.username!}
      bio={user.bio}
      prefs={user.prefs}
      entries={listEntries}
      stats={{ total: entries.length, episodesWatched, avgScore, topGenres }}
      viewerTrackedIds={viewerTrackedIds}
    />
  );
}

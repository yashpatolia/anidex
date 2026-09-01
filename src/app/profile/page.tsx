import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedAnimeCardsByIds } from "@/lib/anime-cache";
import { normalizePrefs } from "@/lib/profile-prefs";
import { ProfileView } from "@/components/profile-view";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, entries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, bio: true, profilePrefs: true },
    }),
    prisma.animeListEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (entries.length === 0) {
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

  return (
    <ProfileView
      username={user?.username ?? null}
      bio={user?.bio ?? null}
      prefs={normalizePrefs(user?.profilePrefs)}
      entries={listEntries}
      stats={{ total: entries.length, episodesWatched, avgScore, topGenres }}
    />
  );
}

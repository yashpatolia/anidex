"use client";

// Client-fetched hydration + stats for the Profile/list page (see
// anilist-client.ts's file comment for the overall architecture). The
// server page (src/app/u/[username]/page.tsx) still resolves access,
// bio, avatar, prefs, and follow state — all our own data — and passes
// raw list entries down; this component hydrates them with real AniList
// data and computes the stats block, then renders the same
// ProfilePageView every other build of this page already used.
import { useEffect, useState } from "react";
import { getAnimeCardsByIds } from "@/lib/anilist-client";
import { ProfilePageView } from "@/components/profile-page-view";
import { PageLoading } from "@/components/page-loading";
import type { ProfilePrefs } from "@/lib/profile-prefs";
import type { ListEntry, ListStats } from "@/lib/list-view";

type RawEntry = { id: string; anilistId: number; status: string; score: number | null; progress: number };

export function ProfileDataView({
  username,
  bio,
  avatarSrc,
  prefs,
  rawEntries,
  isOwner,
  viewerTrackedIds,
  follow,
  emptyOwnerState,
}: {
  username: string;
  bio: string | null;
  avatarSrc: string | null;
  prefs: ProfilePrefs;
  rawEntries: RawEntry[];
  isOwner: boolean;
  viewerTrackedIds: number[];
  follow: { counts: { followers: number; following: number }; showButton: boolean; viewerIsFollowing: boolean };
  emptyOwnerState: React.ReactNode;
}) {
  // Lazy initializer, not a setState-in-effect: an empty list needs no
  // async hydration at all, so it can resolve synchronously on first
  // render instead of round-tripping through an effect.
  const [entries, setEntries] = useState<ListEntry[] | null>(() => (rawEntries.length === 0 ? [] : null));

  useEffect(() => {
    if (rawEntries.length === 0) return;
    let cancelled = false;
    getAnimeCardsByIds(rawEntries.map((e) => e.anilistId)).then((media) => {
      if (cancelled) return;
      const mediaById = new Map(media.map((m) => [m.id, m]));
      setEntries(
        rawEntries
          .map((e) => {
            const anime = mediaById.get(e.anilistId);
            if (!anime) return null;
            return { id: e.id, status: e.status, score: e.score, progress: e.progress, anime };
          })
          .filter((e): e is ListEntry => e !== null),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [rawEntries]);

  if (isOwner && rawEntries.length === 0) return <>{emptyOwnerState}</>;
  if (entries === null) return <PageLoading />;

  const episodesWatched = rawEntries.reduce((sum, e) => sum + e.progress, 0);
  const scored = rawEntries.filter((e) => e.score != null);
  const avgScore = scored.length
    ? (scored.reduce((sum, e) => sum + (e.score ?? 0), 0) / scored.length).toFixed(1)
    : null;

  const genreCounts = new Map<string, number>();
  for (const entry of entries) {
    for (const genre of entry.anime.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const stats: ListStats = { total: rawEntries.length, episodesWatched, avgScore, topGenres };

  return (
    <ProfilePageView
      username={username}
      bio={bio}
      avatarSrc={avatarSrc}
      prefs={prefs}
      entries={entries}
      stats={stats}
      isOwner={isOwner}
      viewerTrackedIds={new Set(viewerTrackedIds)}
      follow={follow}
    />
  );
}

"use client";

// Client-fetched list + stats for the Profile/list page (see
// anilist-client.ts's file comment for the overall architecture). The
// server page (src/app/u/[username]/page.tsx) still resolves access, bio,
// avatar, prefs, and follow state — all our own data — and passes down
// which AniList account to read (the page owner's, and the viewer's own
// for tracked-state); this component does the actual list fetch and stats
// computation, then renders the same ProfilePageView every other build of
// this page already used. A public AniList profile is required for anyone
// but the owner to see anything here — see the empty state below.
import { useEffect, useState } from "react";
import { getUserMediaList } from "@/lib/anilist-client";
import { ProfilePageView } from "@/components/profile-page-view";
import { PageLoading } from "@/components/page-loading";
import type { ProfilePrefs } from "@/lib/profile-prefs";
import type { ListEntry, ListStats } from "@/lib/list-view";

export function ProfileDataView({
  username,
  ownerAnilistUsername,
  bio,
  avatarSrc,
  prefs,
  isOwner,
  viewerAnilistUsername,
  follow,
  emptyOwnerState,
}: {
  username: string;
  // The AniList account this profile actually reads from — our own
  // `username` above is just the display handle (see account-view.tsx),
  // set from this at sign-up but not necessarily identical in case/charset
  // after sanitizing.
  ownerAnilistUsername: string | null;
  bio: string | null;
  avatarSrc: string | null;
  prefs: ProfilePrefs;
  isOwner: boolean;
  // The current *viewer's* own AniList account, used only to compute
  // tracked-state on this page's cards for a signed-in non-owner visitor —
  // never the owner's. Null when signed out, or when isOwner (their own
  // cards are always tracked, no lookup needed).
  viewerAnilistUsername: string | null;
  follow: { counts: { followers: number; following: number }; showButton: boolean; viewerIsFollowing: boolean };
  emptyOwnerState: React.ReactNode;
}) {
  // Lazy initializer, not a setState-in-effect: no linked AniList account
  // means there's nothing to fetch, so that case can resolve synchronously
  // on first render instead of round-tripping through an effect.
  const [entries, setEntries] = useState<ListEntry[] | null>(() => (ownerAnilistUsername ? null : []));
  const [viewerTrackedIds, setViewerTrackedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!ownerAnilistUsername) return;
    let cancelled = false;
    getUserMediaList(ownerAnilistUsername).then((list) => {
      if (!cancelled) setEntries(list);
    });
    return () => {
      cancelled = true;
    };
  }, [ownerAnilistUsername]);

  useEffect(() => {
    let cancelled = false;
    if (!viewerAnilistUsername) return;
    getUserMediaList(viewerAnilistUsername).then((list) => {
      if (!cancelled) setViewerTrackedIds(new Set(list.map((e) => e.anime.id)));
    });
    return () => {
      cancelled = true;
    };
  }, [viewerAnilistUsername]);

  if (entries === null) return <PageLoading />;
  if (isOwner && entries.length === 0) return <>{emptyOwnerState}</>;

  const episodesWatched = entries.reduce((sum, e) => sum + e.progress, 0);
  const scored = entries.filter((e) => e.score != null);
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

  const stats: ListStats = { total: entries.length, episodesWatched, avgScore, topGenres };

  return (
    <ProfilePageView
      username={username}
      bio={bio}
      avatarSrc={avatarSrc}
      prefs={prefs}
      entries={entries}
      stats={stats}
      isOwner={isOwner}
      viewerTrackedIds={viewerTrackedIds}
      follow={follow}
    />
  );
}

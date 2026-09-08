"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getUserMediaList } from "@/lib/anilist-client";
import type { WatchStatus } from "@/lib/anilist-shared";

// Shared by every client-fetched page (Browse, Seasonal, Landing, ...) that
// renders AnimeCard and needs to know which cards are already on the
// signed-in visitor's list — and which status they're under, so a card
// already in the list can show "Watching"/"Completed"/etc instead of just a
// generic checkmark. AniList is the only place list data lives now (see
// anilist-client.ts's file comment) — session.user.name is the visitor's
// own AniList username (see auth.ts's profile() mapping), so this fetches
// their real list directly rather than hitting our own API. Never blocks
// whatever AniList fetch the page itself is running in parallel with this;
// starts empty and fills in once it resolves; a signed-out visitor (or one
// with no linked AniList account, which shouldn't happen in practice —
// AniList is the only sign-in method) just gets an empty map back.
export function useTrackedEntries(): Map<number, WatchStatus> {
  const { data: session } = useSession();
  const anilistUsername = session?.user?.name ?? null;
  const [entries, setEntries] = useState<Map<number, WatchStatus>>(new Map());

  useEffect(() => {
    if (!anilistUsername) return;
    let cancelled = false;
    getUserMediaList(anilistUsername)
      .then((list) => {
        if (!cancelled) setEntries(new Map(list.map((e) => [e.anime.id, e.status])));
      })
      .catch(() => {
        // Best-effort — worst case, already-tracked cards briefly show as
        // untracked until the next render with fresh data.
      });
    return () => {
      cancelled = true;
    };
  }, [anilistUsername]);

  return entries;
}

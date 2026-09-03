"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getUserMediaList } from "@/lib/anilist-client";

// Shared by every client-fetched page (Browse, Seasonal, Landing, ...) that
// renders AnimeCard and needs to know which cards are already on the
// signed-in visitor's list. AniList is the only place list data lives now
// (see anilist-client.ts's file comment) — session.user.name is the
// visitor's own AniList username (see auth.ts's profile() mapping), so
// this fetches their real list directly rather than hitting our own API.
// Never blocks whatever AniList fetch the page itself is running in
// parallel with this; starts empty and fills in once it resolves; a
// signed-out visitor (or one with no linked AniList account, which
// shouldn't happen in practice — AniList is the only sign-in method) just
// gets an empty set back.
export function useTrackedIds(): Set<number> {
  const { data: session } = useSession();
  const anilistUsername = session?.user?.name ?? null;
  const [ids, setIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!anilistUsername) return;
    let cancelled = false;
    getUserMediaList(anilistUsername)
      .then((list) => {
        if (!cancelled) setIds(new Set(list.map((e) => e.anime.id)));
      })
      .catch(() => {
        // Best-effort — worst case, already-tracked cards briefly show as
        // untracked until the next render with fresh data.
      });
    return () => {
      cancelled = true;
    };
  }, [anilistUsername]);

  return ids;
}

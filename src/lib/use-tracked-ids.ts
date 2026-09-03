"use client";

import { useEffect, useState } from "react";

// Shared by every client-fetched page (Browse, Seasonal, Landing, ...) that
// renders AnimeCard and needs to know which cards are already on the
// signed-in visitor's list. Hits our own /api/list/tracked-ids (our own
// DB, no AniList call) — never blocks the AniList fetch those pages run in
// parallel with this; starts empty and fills in once it resolves; a
// signed-out visitor just gets an empty set back (never tracked).
export function useTrackedIds(): Set<number> {
  const [ids, setIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/list/tracked-ids")
      .then((res) => res.json())
      .then((data: { ids: number[] }) => {
        if (!cancelled) setIds(new Set(data.ids));
      })
      .catch(() => {
        // Best-effort — worst case, already-tracked cards briefly show as
        // untracked until the next render with fresh data.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return ids;
}

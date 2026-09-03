"use client";

import { useEffect, useState } from "react";
import { getAiringSchedule } from "@/lib/anilist-client";
import { useTrackedIds } from "@/lib/use-tracked-ids";
import { AiringCalendarView, type AiringItem } from "@/components/airing-calendar-view";
import { PageLoading } from "@/components/page-loading";

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;
// Popularity-ranked cap across the whole week, not per day — some days
// genuinely have more airing anime than others, so this just keeps the
// overall page from ballooning while still surfacing what's actually
// popular (a bottom-of-the-barrel isekai nobody's tracking isn't worth
// showing over something everyone's watching, even on a slow day).
const MAX_ITEMS = 140;

export function AiringView() {
  const trackedIds = useTrackedIds();
  const [items, setItems] = useState<AiringItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const nowSeconds = Math.floor(Date.now() / 1000);

    getAiringSchedule(nowSeconds, nowSeconds + ONE_WEEK_SECONDS)
      .then((schedule) => {
        if (cancelled) return;

        // The same media can occasionally show up twice in one window (a
        // double episode, or an off-by-one at the query boundary) — keep
        // only the earliest airing per id.
        const byMediaId = new Map<number, (typeof schedule)[number]>();
        for (const entry of schedule) {
          const existing = byMediaId.get(entry.media.id);
          if (!existing || entry.airingAt < existing.airingAt) byMediaId.set(entry.media.id, entry);
        }

        setItems(
          [...byMediaId.values()]
            .sort((a, b) => (b.media.popularity ?? 0) - (a.media.popularity ?? 0))
            .slice(0, MAX_ITEMS)
            .map((entry) => ({
              episode: entry.episode,
              airingAt: entry.airingAt,
              anime: entry.media,
              isAdult: entry.media.isAdult,
              initialTracked: trackedIds.has(entry.media.id),
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
    // trackedIds intentionally excluded — it resolves shortly after mount
    // from a separate fetch (useTrackedIds), and re-running the whole
    // schedule fetch just to update initialTracked would be wasteful;
    // QuickAddButton already manages its own tracked state after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadError) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-2 px-8 text-center">
        <h1 className="font-display text-2xl text-paper">Couldn&apos;t load the airing schedule.</h1>
        <p className="text-sm text-ash">AniList might be rate-limiting or temporarily unavailable. Try reloading.</p>
      </main>
    );
  }
  if (!items) return <PageLoading />;
  return <AiringCalendarView items={items} />;
}

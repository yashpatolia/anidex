"use client";

import { useRef } from "react";
import type { AnilistMedia } from "@/lib/anilist-client";
import type { WatchStatus } from "@/lib/anilist-shared";
import { AnimeCard } from "@/components/anime-card";

export function AnimeRail({
  title,
  media,
  trackedIds,
  trackedStatuses,
  onItemStatusChange,
}: {
  title: string;
  media: AnilistMedia[];
  trackedIds?: number[];
  // Real per-id status, when the caller has it (landing-rails' Trending/
  // Popular/Top rated). Takes precedence over trackedIds for a given id;
  // trackedIds stays around for callers that only know plain tracked/
  // untracked.
  trackedStatuses?: Map<number, WatchStatus>;
  // Fires when a card's own status editor changes what's tracked, e.g. for
  // a caller (Recommendations, landing's "Recommended" row) that needs to
  // drop a card the moment it gets tracked rather than keep showing
  // something that no longer belongs in the row.
  onItemStatusChange?: (anilistId: number, status: WatchStatus | null) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const tracked = new Set(trackedIds);

  if (media.length === 0) return null;

  function scrollBy(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  }

  return (
    <section className="group/rail flex flex-col gap-4 border-t border-line py-6">
      <h2 className="px-8 font-mono text-xs uppercase tracking-widest text-ash 2xl:px-16">
        {title}
      </h2>

      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto px-8 pb-2 scroll-pl-8 scroll-pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden 2xl:px-16 2xl:scroll-pl-16 2xl:scroll-pr-16"
          style={{ scrollSnapType: "x proximity" }}
        >
          {media.map((anime) => (
            <div
              key={anime.id}
              className="w-[170px] flex-shrink-0 lg:w-[190px]"
              style={{ scrollSnapAlign: "start" }}
            >
              <AnimeCard
                anime={anime}
                initialTracked={tracked.has(anime.id)}
                initialStatus={trackedStatuses?.get(anime.id) ?? null}
                onStatusChange={
                  onItemStatusChange ? (status) => onItemStatusChange(anime.id, status) : undefined
                }
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label={`Scroll ${title} left`}
          onClick={() => scrollBy(-1)}
          className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink/90 font-mono text-base text-paper opacity-0 transition-all duration-200 hover:border-hanko hover:text-hanko group-hover/rail:opacity-100 lg:flex"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label={`Scroll ${title} right`}
          onClick={() => scrollBy(1)}
          className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink/90 font-mono text-base text-paper opacity-0 transition-all duration-200 hover:border-hanko hover:text-hanko group-hover/rail:opacity-100 lg:flex"
        >
          ›
        </button>
      </div>
    </section>
  );
}

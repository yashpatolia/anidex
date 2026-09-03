import type { ReactNode } from "react";
import type { AnilistMedia } from "@/lib/anilist-client";

// Used by ProfilePageView (src/components/profile-page-view.tsx), the one
// page rendered at both /profile (redirects here for the signed-in user)
// and /u/[username] — the grouped/sortable/searchable grid of entries.

export type ViewMode = "grid" | "list" | "compact";
export type SortMode = "titleAsc" | "titleDesc" | "scoreAsc" | "scoreDesc";

export type ListEntry = {
  id: string;
  status: string;
  score: number | null;
  progress: number;
  anime: AnilistMedia;
};

export type ListStats = {
  total: number;
  episodesWatched: number;
  avgScore: string | null;
  topGenres: [string, number][];
};

export const SORT_MODES: { value: SortMode; label: string; icon: ReactNode }[] = [
  {
    value: "titleAsc",
    label: "Title, A to Z",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
        <text x="1.5" y="8" fontSize="7" fontFamily="var(--font-mono-family), monospace" fill="currentColor" stroke="none">
          A
        </text>
        <text x="1.5" y="17" fontSize="7" fontFamily="var(--font-mono-family), monospace" fill="currentColor" stroke="none">
          Z
        </text>
        <line x1="12.5" y1="4" x2="12.5" y2="14.5" strokeLinecap="round" />
        <path d="M9.5 11.5 L12.5 15 L15.5 11.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    value: "titleDesc",
    label: "Title, Z to A",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
        <text x="1.5" y="8" fontSize="7" fontFamily="var(--font-mono-family), monospace" fill="currentColor" stroke="none">
          Z
        </text>
        <text x="1.5" y="17" fontSize="7" fontFamily="var(--font-mono-family), monospace" fill="currentColor" stroke="none">
          A
        </text>
        <line x1="12.5" y1="5.5" x2="12.5" y2="16" strokeLinecap="round" />
        <path d="M9.5 8.5 L12.5 5 L15.5 8.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    value: "scoreAsc",
    label: "Rating, low-high",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path
          d="M5.5 3 L6.6 5.5 L9.3 5.9 L7.4 7.8 L7.9 10.5 L5.5 9.2 L3.1 10.5 L3.6 7.8 L1.7 5.9 L4.4 5.5 Z"
          strokeLinejoin="round"
        />
        <line x1="14.5" y1="16" x2="14.5" y2="5.5" strokeLinecap="round" />
        <path d="M11.5 8.5 L14.5 5 L17.5 8.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    value: "scoreDesc",
    label: "Rating, high-low",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path
          d="M5.5 3 L6.6 5.5 L9.3 5.9 L7.4 7.8 L7.9 10.5 L5.5 9.2 L3.1 10.5 L3.6 7.8 L1.7 5.9 L4.4 5.5 Z"
          strokeLinejoin="round"
        />
        <line x1="14.5" y1="4" x2="14.5" y2="14.5" strokeLinecap="round" />
        <path d="M11.5 11.5 L14.5 15 L17.5 11.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
];

export const VIEW_MODES: { value: ViewMode; label: string; icon: ReactNode }[] = [
  {
    value: "grid",
    label: "Grid view",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2.5" y="2.5" width="6" height="6" />
        <rect x="11.5" y="2.5" width="6" height="6" />
        <rect x="2.5" y="11.5" width="6" height="6" />
        <rect x="11.5" y="11.5" width="6" height="6" />
      </svg>
    ),
  },
  {
    value: "list",
    label: "List view",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2.5" y="3.5" width="3" height="3" />
        <line x1="8.5" y1="5" x2="17.5" y2="5" strokeLinecap="round" />
        <rect x="2.5" y="8.5" width="3" height="3" />
        <line x1="8.5" y1="10" x2="17.5" y2="10" strokeLinecap="round" />
        <rect x="2.5" y="13.5" width="3" height="3" />
        <line x1="8.5" y1="15" x2="17.5" y2="15" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "compact",
    label: "Compact view",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="4" height="4" />
        <rect x="8" y="2" width="4" height="4" />
        <rect x="14" y="2" width="4" height="4" />
        <rect x="2" y="8" width="4" height="4" />
        <rect x="8" y="8" width="4" height="4" />
        <rect x="14" y="8" width="4" height="4" />
        <rect x="2" y="14" width="4" height="4" />
        <rect x="8" y="14" width="4" height="4" />
        <rect x="14" y="14" width="4" height="4" />
      </svg>
    ),
  },
];

export const GRID_COLS = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-10";
export const COMPACT_COLS =
  "grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 2xl:grid-cols-14";

export function entryTitle(entry: { anime: AnilistMedia }): string {
  return entry.anime.title.english ?? entry.anime.title.romaji ?? entry.anime.title.native ?? "";
}

export function sortEntries<T extends { anime: AnilistMedia; score: number | null }>(
  list: T[],
  mode: SortMode,
): T[] {
  const sorted = [...list];
  sorted.sort((a, b) => {
    switch (mode) {
      case "titleAsc":
        return entryTitle(a).localeCompare(entryTitle(b));
      case "titleDesc":
        return entryTitle(b).localeCompare(entryTitle(a));
      case "scoreAsc":
        return (a.score ?? -1) - (b.score ?? -1);
      case "scoreDesc":
        return (b.score ?? -1) - (a.score ?? -1);
    }
  });
  return sorted;
}

// Pure constants/functions shared between server and client code —
// deliberately no "use client"/"use server" directive, since Next.js
// enforces that boundary even for plain function calls (not just JSX):
// a Server Component can't call a function exported from a "use client"
// module directly, even a pure one with no client-only APIs in it. This
// file exists so SEASONS/getCurrentSeason/BROWSE_* can be imported from
// either side without hitting that.
export const SEASONS = [
  { value: "WINTER", label: "Winter" },
  { value: "SPRING", label: "Spring" },
  { value: "SUMMER", label: "Summer" },
  { value: "FALL", label: "Fall" },
] as const;

// Standard anime-industry season boundaries: Winter Dec-Feb, Spring Mar-May,
// Summer Jun-Aug, Fall Sep-Nov. December counts toward next year's Winter.
export function getCurrentSeason(): { season: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month === 12) return { season: "WINTER", year: year + 1 };
  if (month <= 2) return { season: "WINTER", year };
  if (month <= 5) return { season: "SPRING", year };
  if (month <= 8) return { season: "SUMMER", year };
  return { season: "FALL", year };
}

export const BROWSE_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror",
  "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance",
  "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
] as const;

export const BROWSE_FORMATS = [
  { value: "TV", label: "TV" },
  { value: "TV_SHORT", label: "TV Short" },
  { value: "MOVIE", label: "Movie" },
  { value: "SPECIAL", label: "Special" },
  { value: "OVA", label: "OVA" },
  { value: "ONA", label: "ONA" },
  { value: "MUSIC", label: "Music" },
] as const;

export const BROWSE_STATUSES = [
  { value: "RELEASING", label: "Airing" },
  { value: "FINISHED", label: "Finished" },
  { value: "NOT_YET_RELEASED", label: "Upcoming" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "HIATUS", label: "Hiatus" },
] as const;

export const BROWSE_SORTS = [
  { value: "POPULARITY_DESC", label: "Popularity" },
  { value: "SCORE_DESC", label: "Score" },
  { value: "TRENDING_DESC", label: "Trending" },
  { value: "START_DATE_DESC", label: "Newest" },
] as const;

// AniDex's own list-status vocabulary, and its mapping to/from AniList's
// MediaListStatus enum (names differ for two of six: WATCHING <-> CURRENT,
// REWATCHING <-> REPEATING). Deliberately a plain array/union here, not
// the generated Prisma enum — AniList *is* the list store now (see
// anilist-client.ts's file comment), so this has no database-generated
// code to mirror; it's just the shape both the browser (reading/writing
// AniList directly) and the server (writing AniList via the stored OAuth
// token) need to agree on. An array (not just a union type) so it doubles
// as a zod z.enum() source wherever a route needs to validate one.
export const WATCH_STATUSES = ["WATCHING", "COMPLETED", "PLANNED", "DROPPED", "PAUSED", "REWATCHING"] as const;
export type WatchStatus = (typeof WATCH_STATUSES)[number];

export const STATUS_TO_ANILIST: Record<WatchStatus, string> = {
  WATCHING: "CURRENT",
  COMPLETED: "COMPLETED",
  PLANNED: "PLANNING",
  DROPPED: "DROPPED",
  PAUSED: "PAUSED",
  REWATCHING: "REPEATING",
};

export const ANILIST_STATUS_TO_OURS: Record<string, WatchStatus> = {
  CURRENT: "WATCHING",
  PLANNING: "PLANNED",
  COMPLETED: "COMPLETED",
  DROPPED: "DROPPED",
  PAUSED: "PAUSED",
  REPEATING: "REWATCHING",
};

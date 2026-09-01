// Server-only. Drop-in replacement for browseAnime() that, when there's a
// search term, searches our own local title index (real substring matching)
// instead of AniList's fuzzy search, hydrates the matches, and applies the
// rest of the filters/sort/pagination in-app. With no search term, this is
// just browseAnime() — AniList's own filtering is fine for that case.
import { browseAnime, type BrowseFilters, type AnilistMediaDetail } from "@/lib/anilist";
import { searchLocalTitleIds } from "@/lib/anime-title-index";
import { getCachedAnimeByIds } from "@/lib/anime-cache";

type Sorter = (a: AnilistMediaDetail, b: AnilistMediaDetail) => number;

const SORTERS: Record<string, Sorter> = {
  POPULARITY_DESC: (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
  SCORE_DESC: (a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0),
  // No local trending signal (that's a live AniList ranking) — popularity is
  // the closest reasonable stand-in when search results need ordering.
  TRENDING_DESC: (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
  START_DATE_DESC: (a, b) => (b.seasonYear ?? 0) - (a.seasonYear ?? 0),
};

export async function browseWithSearch(filters: BrowseFilters) {
  const {
    search, genres, yearFrom, yearTo, formats, statuses, minScore,
    sort = "POPULARITY_DESC", page = 1, perPage = 30,
  } = filters;

  if (!search) return browseAnime(filters);

  const candidateIds = await searchLocalTitleIds(search);
  if (candidateIds.length === 0) {
    // Not in our local index (new/very obscure title) — fall back to
    // AniList's own search as a last resort rather than showing nothing.
    return browseAnime(filters);
  }

  const hydrated = await getCachedAnimeByIds(candidateIds);

  const filtered = hydrated.filter((m) => {
    if (genres?.length && !genres.some((g) => m.genres.includes(g))) return false;
    if (formats?.length && !(m.format && formats.includes(m.format))) return false;
    if (statuses?.length && !(m.status && statuses.includes(m.status))) return false;
    if (minScore != null && (m.averageScore ?? 0) < minScore) return false;
    if (yearFrom != null && (m.seasonYear ?? 0) < yearFrom) return false;
    if (yearTo != null && (m.seasonYear ?? 9999) > yearTo) return false;
    return true;
  });

  filtered.sort(SORTERS[sort] ?? SORTERS.POPULARITY_DESC);

  const total = filtered.length;
  const start = (page - 1) * perPage;
  const media = filtered.slice(start, start + perPage);

  return {
    media,
    pageInfo: {
      total,
      currentPage: page,
      hasNextPage: start + perPage < total,
      lastPage: Math.max(1, Math.ceil(total / perPage)),
    },
  };
}

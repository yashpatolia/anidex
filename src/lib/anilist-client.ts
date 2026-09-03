"use client";

// Browser-side client for the public AniList GraphQL API
// (https://docs.anilist.co/). Runs in the visitor's own browser, under
// their own IP — not server.ts, which is what src/lib/anilist.ts (the
// server-side module) used to be for every page. That's the whole point:
// AniList's rate limit concentrates per requesting IP (confirmed directly
// with AniList's own developers, not just inferred from their docs — see
// .claude-session-state.md), so routing all of AniDex's traffic through
// one server IP meant every visitor shared one small budget. Each
// visitor's browser calling AniList directly gets its own.
//
// This also means no server-side persistence of AniList's data at all —
// also confirmed directly with AniList's devs as required, not optional:
// server-side caching (the old AnimeCache table) counts as "hoarding"
// under their ToS, not just an unnecessary optimization. Query results
// here live only in whatever component state/browser cache calls them,
// never written to our own database. The one narrow exception is
// generateMetadata() on server-rendered pages (OG/Twitter tags for
// crawlers, which can't run this client-side code at all) — that still
// uses src/lib/anilist.ts server-side, live per request, still never
// persisted anywhere.
//
// Query field shapes and function signatures deliberately mirror
// anilist.ts's — this is the same API, just called from a different
// place, not a redesign.
//
// SEASONS/getCurrentSeason/BROWSE_* moved out to anilist-shared.ts and are
// just re-exported here for convenience — a Server Component can't call a
// function exported from a "use client" module directly (Next.js enforces
// that boundary even for plain, non-JSX function calls), and
// seasonal/page.tsx needs getCurrentSeason() before it ever renders
// anything client-side.
export { SEASONS, getCurrentSeason, BROWSE_GENRES, BROWSE_FORMATS, BROWSE_STATUSES, BROWSE_SORTS } from "@/lib/anilist-shared";
import { ANILIST_STATUS_TO_OURS, type WatchStatus } from "@/lib/anilist-shared";

const ANILIST_URL = "https://graphql.anilist.co";

export type AnilistMedia = {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null };
  coverImage: { extraLarge: string | null; large: string | null; color: string | null };
  bannerImage: string | null;
  description: string | null;
  format: string | null;
  status: string | null;
  episodes: number | null;
  averageScore: number | null;
  popularity: number | null;
  genres: string[];
  seasonYear: number | null;
};

export type AnilistMediaDetail = AnilistMedia & {
  duration: number | null;
  source: string | null;
  studios: { nodes: { name: string }[] };
  relations: {
    edges: {
      relationType: string;
      node: {
        id: number;
        type: string;
        title: { romaji: string | null; english: string | null };
        coverImage: { large: string | null };
      };
    }[];
  };
  characters: {
    edges: {
      role: string;
      node: { id: number; name: { full: string | null }; image: { large: string | null } };
      voiceActors: { id: number; name: { full: string | null }; image: { large: string | null } }[];
    }[];
  };
  recommendations: {
    nodes: { mediaRecommendation: AnilistMedia | null }[];
  };
};

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { extraLarge large color }
  bannerImage
  description(asHtml: false)
  format
  status
  episodes
  averageScore
  popularity
  genres
  seasonYear
`;

const MEDIA_DETAIL_FIELDS = `
  ${MEDIA_FIELDS}
  duration
  source
  studios(isMain: true) {
    nodes { name }
  }
  relations {
    edges {
      relationType
      node {
        id
        type
        title { romaji english }
        coverImage { large }
      }
    }
  }
  characters(sort: ROLE, perPage: 8) {
    edges {
      role
      node {
        id
        name { full }
        image { large }
      }
      voiceActors(language: JAPANESE) {
        id
        name { full }
        image { large }
      }
    }
  }
  recommendations(sort: RATING_DESC, perPage: 8) {
    nodes {
      mediaRecommendation { ${MEDIA_FIELDS} }
    }
  }
`;

export class AnilistError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retries on 429 like the server module used to — still a shared public
// API with a real limit, just no longer a limit this app's whole
// userbase shares through one IP.
async function anilistFetch<T>(
  query: string,
  variables: Record<string, unknown>,
  attempt = 1,
): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429 && attempt <= 3) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const backoff = (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1500) + attempt * 500;
    await sleep(backoff);
    return anilistFetch<T>(query, variables, attempt + 1);
  }

  const json = await res.json();

  if (!res.ok || json.errors) {
    const message = json.errors?.[0]?.message ?? `AniList request failed (${res.status})`;
    throw new AnilistError(message, res.status);
  }

  return json.data;
}

export async function searchAnime(search: string, page = 1, perPage = 20) {
  const query = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage hasNextPage }
        media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch<{
    Page: { pageInfo: { total: number; currentPage: number; hasNextPage: boolean }; media: AnilistMedia[] };
  }>(query, { search, page, perPage });
  return data.Page;
}

export async function getAnimeById(id: number): Promise<AnilistMediaDetail | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_DETAIL_FIELDS}
      }
    }
  `;
  try {
    const data = await anilistFetch<{ Media: AnilistMediaDetail | null }>(query, { id });
    return data.Media;
  } catch (err) {
    if (err instanceof AnilistError && err.status === 404) return null;
    throw err;
  }
}

async function getMediaByIds<T>(ids: number[], fields: string, aliasesPerRequest: number): Promise<T[]> {
  if (ids.length === 0) return [];

  const CHUNK = 50;
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));

  const groups: number[][][] = [];
  for (let i = 0; i < chunks.length; i += aliasesPerRequest) {
    groups.push(chunks.slice(i, i + aliasesPerRequest));
  }

  const results = await Promise.all(
    groups.map(async (group) => {
      const query = `
        query (${group.map((_, i) => `$ids${i}: [Int], $perPage${i}: Int`).join(", ")}) {
          ${group
            .map(
              (_, i) => `
            c${i}: Page(perPage: $perPage${i}) {
              media(id_in: $ids${i}, type: ANIME) {
                ${fields}
              }
            }`,
            )
            .join("\n")}
        }
      `;
      const variables: Record<string, unknown> = {};
      group.forEach((chunk, i) => {
        variables[`ids${i}`] = chunk;
        variables[`perPage${i}`] = chunk.length;
      });

      const data = await anilistFetch<Record<string, { media: T[] }>>(query, variables);
      return group.flatMap((_, i) => data[`c${i}`].media);
    }),
  );
  return results.flat();
}

export function getAnimeByIds(ids: number[]): Promise<AnilistMediaDetail[]> {
  return getMediaByIds<AnilistMediaDetail>(ids, MEDIA_DETAIL_FIELDS, 4);
}

export function getAnimeCardsByIds(ids: number[]): Promise<AnilistMedia[]> {
  return getMediaByIds<AnilistMedia>(ids, MEDIA_FIELDS, 10);
}

export type AnilistListEntry = {
  status: WatchStatus;
  score: number | null;
  progress: number;
  anime: AnilistMedia;
};

// A whole user's AniList anime list, hydrated with full card fields in one
// request — AniList *is* the list store now (see this file's header
// comment), so this replaces every place that used to read AniDex's own
// AnimeListEntry table: Profile/u/[username] (own or someone else's, as
// long as it's public on AniList), the tracked-ids overlay on cards
// (useTrackedIds), recommendations' watched anchors, and notifications'
// Watching list. `score(format: POINT_10)` normalizes AniList's own
// per-profile scoreFormat setting (POINT_100, POINT_5, etc.) to this app's
// fixed 1-10 scale, so callers never need to know or care what scale the
// list owner's AniList profile actually uses.
export async function getUserMediaList(username: string): Promise<AnilistListEntry[]> {
  const query = `
    query ($username: String) {
      MediaListCollection(userName: $username, type: ANIME) {
        lists {
          entries {
            status
            score(format: POINT_10)
            progress
            media { ${MEDIA_FIELDS} }
          }
        }
      }
    }
  `;
  const data = await anilistFetch<{
    MediaListCollection: {
      lists: { entries: { status: string; score: number; progress: number; media: AnilistMedia }[] }[];
    } | null;
  }>(query, { username });

  if (!data.MediaListCollection) return [];
  return data.MediaListCollection.lists.flatMap((list) =>
    list.entries.map((e) => ({
      status: ANILIST_STATUS_TO_OURS[e.status] ?? "PLANNED",
      score: e.score > 0 ? Math.round(e.score) : null,
      progress: e.progress,
      anime: e.media,
    })),
  );
}

// A single anime's list entry for one user — only ever the *signed-in*
// user's own (AniList's MediaList query only resolves entries for the
// authenticated viewer; there's no userName-filtered single-entry lookup —
// confirmed live against the schema), used by the anime detail page to
// show the current status/score/progress in AddToListControl. A null
// result means signed out, or not tracked.
export async function getUserMediaListEntry(
  anilistId: number,
  username: string,
): Promise<{ status: WatchStatus; score: number | null; progress: number } | null> {
  const query = `
    query ($mediaId: Int, $userName: String) {
      MediaList(mediaId: $mediaId, userName: $userName) {
        status
        score(format: POINT_10)
        progress
      }
    }
  `;
  try {
    const data = await anilistFetch<{ MediaList: { status: string; score: number; progress: number } | null }>(
      query,
      { mediaId: anilistId, userName: username },
    );
    if (!data.MediaList) return null;
    return {
      status: ANILIST_STATUS_TO_OURS[data.MediaList.status] ?? "PLANNED",
      score: data.MediaList.score > 0 ? Math.round(data.MediaList.score) : null,
      progress: data.MediaList.progress,
    };
  } catch (err) {
    // AniList 404s (not a GraphQL "errors" response, an actual HTTP 404)
    // when there's no entry for this media/user pair at all.
    if (err instanceof AnilistError && err.status === 404) return null;
    throw err;
  }
}

export async function getSeasonalAnime(season: string, year: number, page = 1, perPage = 50) {
  const query = `
    query ($page: Int, $perPage: Int, $season: MediaSeason, $year: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage hasNextPage lastPage }
        media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch<{
    Page: {
      pageInfo: { total: number; currentPage: number; hasNextPage: boolean; lastPage: number };
      media: AnilistMedia[];
    };
  }>(query, { page, perPage, season, year });
  return data.Page;
}

async function getMediaBySort(sort: string, page = 1, perPage = 20) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage hasNextPage }
        media(type: ANIME, sort: ${sort}, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch<{
    Page: { pageInfo: { total: number; currentPage: number; hasNextPage: boolean }; media: AnilistMedia[] };
  }>(query, { page, perPage });
  return data.Page;
}

export function getTrendingAnime(page = 1, perPage = 20) {
  return getMediaBySort("TRENDING_DESC", page, perPage);
}

export function getPopularAnime(page = 1, perPage = 20) {
  return getMediaBySort("POPULARITY_DESC", page, perPage);
}

export function getTopRatedAnime(page = 1, perPage = 20) {
  return getMediaBySort("SCORE_DESC", page, perPage);
}

export async function getLandingRails(perPage = 24) {
  const query = `
    query ($perPage: Int) {
      trending: Page(page: 1, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ${MEDIA_FIELDS} }
      }
      popular: Page(page: 1, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) { ${MEDIA_FIELDS} }
      }
      topRated: Page(page: 1, perPage: $perPage) {
        media(type: ANIME, sort: SCORE_DESC, isAdult: false) { ${MEDIA_FIELDS} }
      }
    }
  `;
  const data = await anilistFetch<{
    trending: { media: AnilistMedia[] };
    popular: { media: AnilistMedia[] };
    topRated: { media: AnilistMedia[] };
  }>(query, { perPage });

  return {
    trending: data.trending.media,
    popular: data.popular.media,
    topRated: data.topRated.media,
  };
}

export type BrowseFilters = {
  search?: string;
  genres?: string[];
  yearFrom?: number;
  yearTo?: number;
  formats?: string[];
  statuses?: string[];
  minScore?: number;
  sort?: string;
  page?: number;
  perPage?: number;
};

export async function browseAnime(filters: BrowseFilters) {
  const {
    search, genres, yearFrom, yearTo, formats, statuses, minScore,
    sort = "POPULARITY_DESC", page = 1, perPage = 50,
  } = filters;

  const startDateGreater = yearFrom ? (yearFrom - 1) * 10000 + 1231 : undefined;
  const startDateLesser = yearTo ? (yearTo + 1) * 10000 + 101 : undefined;

  const query = `
    query (
      $page: Int, $perPage: Int, $search: String, $genre_in: [String], $startDateGreater: FuzzyDateInt,
      $startDateLesser: FuzzyDateInt, $format_in: [MediaFormat], $status_in: [MediaStatus],
      $minScore: Int, $sort: [MediaSort]
    ) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage hasNextPage lastPage }
        media(
          type: ANIME
          isAdult: false
          search: $search
          genre_in: $genre_in
          startDate_greater: $startDateGreater
          startDate_lesser: $startDateLesser
          format_in: $format_in
          status_in: $status_in
          averageScore_greater: $minScore
          sort: $sort
        ) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch<{
    Page: {
      pageInfo: { total: number; currentPage: number; hasNextPage: boolean; lastPage: number };
      media: AnilistMedia[];
    };
  }>(query, {
    page, perPage, search,
    genre_in: genres?.length ? genres : undefined,
    startDateGreater, startDateLesser,
    format_in: formats?.length ? formats : undefined,
    status_in: statuses?.length ? statuses : undefined,
    minScore, sort: [sort],
  });
  return data.Page;
}

// --- Airing calendar support ---

export type AiringScheduleEntry = {
  airingAt: number;
  episode: number;
  media: AnilistMedia & { isAdult: boolean };
};

export async function getAiringSchedule(fromUnix: number, toUnix: number): Promise<AiringScheduleEntry[]> {
  const PER_PAGE = 50;
  const MAX_PAGES = 4;
  const query = `
    query ($from: Int, $to: Int, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
          airingAt
          episode
          media {
            ${MEDIA_FIELDS}
            isAdult
          }
        }
      }
    }
  `;

  const entries: AiringScheduleEntry[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await anilistFetch<{
      Page: { pageInfo: { hasNextPage: boolean }; airingSchedules: AiringScheduleEntry[] };
    }>(query, { from: fromUnix, to: toUnix, page, perPage: PER_PAGE });
    entries.push(...data.Page.airingSchedules);
    if (!data.Page.pageInfo.hasNextPage) break;
  }
  return entries;
}

// --- Notification support ---

const NEXT_EPISODE_FIELDS = `
  id
  nextAiringEpisode { episode }
`;

export type AnilistNextEpisode = {
  id: number;
  nextAiringEpisode: { episode: number } | null;
};

export function getNextEpisodesByIds(ids: number[]): Promise<AnilistNextEpisode[]> {
  return getMediaByIds<AnilistNextEpisode>(ids, NEXT_EPISODE_FIELDS, 10);
}

// Server-side client for the public AniList GraphQL API
// (https://docs.anilist.co/). Used to front every browsing page in the
// app; now narrowed to the few legitimate server-only cases that remain
// (generateMetadata() for OG/Twitter tags on crawled pages, and the
// import feature's title-resolution fallback) — everywhere else moved to
// src/lib/anilist-client.ts, called from the browser directly. See that
// file's comment for why: AniList's rate limit concentrates per
// requesting IP (confirmed with their devs), so routing all of AniDex's
// traffic through one server IP meant the whole userbase shared one
// budget, and per their devs, server-side storage of their data counts as
// hoarding under the ToS regardless of rate limits.
//
// No caching of any kind here anymore — this used to wrap every call in
// unstable_cache (Next's server-side data cache), which is exactly the
// kind of server-side persistence that's no longer allowed. Every call
// through this module is now a live, uncached, use-once-and-discard
// request, same as anilist-client.ts's browser calls just made from the
// server for the narrow cases that still need to be.
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
`;

class AnilistError extends Error {
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

// AniList's shared anonymous rate limit is easy to trip under real traffic
// (every uncached anime lookup, and there are several per page load, counts
// against it) — without a retry here, a transient 429 propagated straight
// up as an uncaught error and took down the whole page via the error
// boundary. Retry a couple of times with backoff (respecting Retry-After
// when AniList sends one) before actually giving up; callers like
// anime-cache.ts already know how to fall back to stale cached data if this
// still throws after that.
//
// Deliberately untyped (returns unknown) — this is wrapped in unstable_cache
// below, and keeping it non-generic avoids fixing a single type parameter
// into that cached function for every call site. anilistFetch (the public,
// generic wrapper) does the cast back to T.
async function anilistFetchWithRetry(
  query: string,
  variables: Record<string, unknown>,
  attempt = 1,
): Promise<unknown> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429 && attempt <= 3) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const backoff = (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1500) + attempt * 500;
    await sleep(backoff);
    return anilistFetchWithRetry(query, variables, attempt + 1);
  }

  const json = await res.json();

  if (!res.ok || json.errors) {
    const message = json.errors?.[0]?.message ?? `AniList request failed (${res.status})`;
    throw new AnilistError(message, res.status);
  }

  return json.data;
}

async function anilistFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  return (await anilistFetchWithRetry(query, variables)) as T;
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
    // AniList responds with a hard "Not Found" GraphQL error (rather than a
    // null Media) for an id that doesn't exist. Treat that as a normal miss
    // so callers can 404; anything else is a real failure and should propagate.
    if (err instanceof AnilistError && err.status === 404) return null;
    throw err;
  }
}

// Shared batching engine behind getAnimeByIds and getAnimeCardsByIds below.
// AniList clamps any id_in lookup to 50 results per page regardless of the
// requested perPage — silently, no error — so anything past the first 50
// ids in a single request would just vanish from the response. Multiple
// 50-item chunks can still share one HTTP request via GraphQL aliases
// (same trick as getLandingRails above), meaningfully cutting requests for
// a big list. ALIASES_PER_REQUEST is deliberately conservative (not "every
// chunk in one request") for the detail-fields caller specifically, since
// those carry the full nested shape — characters, relations, studios — and
// AniList doesn't document a query complexity cap to size against.
async function getMediaByIds<T>(
  ids: number[],
  fields: string,
  aliasesPerRequest: number,
): Promise<T[]> {
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

// Full detail shape (characters, relations, studios) — for the anime
// detail page, and anywhere else that genuinely needs it. Prefer
// getAnimeCardsByIds below for list/card views; it's a much lighter
// payload for the same ids.
export function getAnimeByIds(ids: number[]): Promise<AnilistMediaDetail[]> {
  return getMediaByIds<AnilistMediaDetail>(ids, MEDIA_DETAIL_FIELDS, 4);
}

// Light card fields only (title, cover, genres, score, etc.) — no
// characters/relations/studios. For Browse/Seasonal/Profile/search-style
// views, which never render that data anyway. Much smaller payload than
// getAnimeByIds for the same ids, so more chunks safely share one request.
export function getAnimeCardsByIds(ids: number[]): Promise<AnilistMedia[]> {
  return getMediaByIds<AnilistMedia>(ids, MEDIA_FIELDS, 10);
}

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

// The landing page's three rails used to be three separate AniList
// requests fired in parallel. GraphQL lets multiple root fields share one
// request via aliases, so this collapses them into one HTTP call — on
// AniList's current degraded 30 req/min limit, that's the difference
// between one page load costing 3 requests or 1.
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

// --- List import support (src/app/import) ---

// AniList tracks each anime's MyAnimeList id too, so a MAL export's numeric
// ids can be resolved to our (AniList) ids in bulk without any fuzzy
// matching. Returns malId -> anilistId for whichever of the given ids
// AniList actually has a match for; ids with no match are simply absent.
export async function getAnilistIdsByMalIds(malIds: number[]): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (malIds.length === 0) return result;

  // AniList clamps any id_in-style lookup to 50 results per page.
  const CHUNK = 50;
  for (let i = 0; i < malIds.length; i += CHUNK) {
    const chunk = malIds.slice(i, i + CHUNK);
    const query = `
      query ($ids: [Int]) {
        Page(perPage: ${chunk.length}) {
          media(idMal_in: $ids, type: ANIME) {
            id
            idMal
          }
        }
      }
    `;
    const data = await anilistFetch<{ Page: { media: { id: number; idMal: number | null }[] } }>(
      query,
      { ids: chunk },
    );
    for (const m of data.Page.media) {
      if (m.idMal != null) result.set(m.idMal, m.id);
    }
  }
  return result;
}

export type AnilistListEntry = {
  anilistId: number;
  status: string; // MediaListStatus: CURRENT/PLANNING/COMPLETED/DROPPED/PAUSED/REPEATING
  score: number; // normalized to a 0-10 scale, 0 = unscored
  progress: number;
};

// Fetches a public AniList user's full anime list via their username — no
// auth required, this is how AniList's own "export" works too. Throws if
// the username doesn't exist or the profile/list is private.
export async function getAnilistUserList(username: string): Promise<AnilistListEntry[]> {
  const query = `
    query ($username: String) {
      MediaListCollection(userName: $username, type: ANIME) {
        lists {
          entries {
            status
            progress
            score(format: POINT_10)
            media { id }
          }
        }
      }
    }
  `;
  const data = await anilistFetch<{
    MediaListCollection: {
      lists: { entries: { status: string; progress: number; score: number; media: { id: number } }[] }[];
    } | null;
  }>(query, { username });

  if (!data.MediaListCollection) return [];
  return data.MediaListCollection.lists.flatMap((list) =>
    list.entries.map((e) => ({
      anilistId: e.media.id,
      status: e.status,
      score: e.score,
      progress: e.progress,
    })),
  );
}

// --- Airing calendar support (src/app/airing) ---

export type AiringScheduleEntry = {
  airingAt: number;
  episode: number;
  media: AnilistMedia & { isAdult: boolean };
};

// AniList's dedicated schedule connection — every episode airing in a given
// time window, across all of AniList, independent of any particular user's
// list. This is the right tool for a general "what's airing this week"
// calendar (unlike nextAiringEpisode on Media, which only ever exposes one
// show's single next episode and requires already knowing which ids to
// ask about).
//
// Paginates up to MAX_PAGES since a full week's schedule easily exceeds one
// page; that cap is generous enough to cover a week's worth of airing TV
// without risking an unbounded number of requests if AniList's data ever
// has an unexpectedly long tail.
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

// --- Notification support (src/lib/notifications) ---

const NEXT_EPISODE_FIELDS = `
  id
  nextAiringEpisode { episode }
`;

export type AnilistNextEpisode = {
  id: number;
  // null once a show has finished airing (or never aired episodically to
  // begin with) — same one-next-episode-only limitation as the airing
  // calendar's data source.
  nextAiringEpisode: { episode: number } | null;
};

// Per-id lookup (unlike getAiringSchedule, which answers "what's airing in
// this time window" across all of AniList) — this is for checking a
// specific user's own Watching list against what's already aired, which
// needs the narrower "given these ids, what's their next episode" shape.
// Reuses the same chunking/aliasing engine as getAnimeCardsByIds.
export function getNextEpisodesByIds(ids: number[]): Promise<AnilistNextEpisode[]> {
  return getMediaByIds<AnilistNextEpisode>(ids, NEXT_EPISODE_FIELDS, 10);
}

export async function browseAnime(filters: BrowseFilters) {
  const {
    search, genres, yearFrom, yearTo, formats, statuses, minScore,
    sort = "POPULARITY_DESC", page = 1, perPage = 50,
  } = filters;

  // AniList's date filters are FuzzyDateInt scalars in YYYYMMDD form. To make
  // a yearFrom..yearTo range inclusive, compare against the day just outside
  // each end (Dec 31 of the prior year / Jan 1 of the next year).
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

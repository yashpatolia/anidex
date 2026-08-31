// Thin client for the public AniList GraphQL API (https://docs.anilist.co/).
// No API key needed for reads. Responses are cached by Next's fetch layer
// (`next.revalidate`) to stay well under AniList's rate limit.

const ANILIST_URL = "https://graphql.anilist.co";

export type AnilistMedia = {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null };
  coverImage: { large: string | null; color: string | null };
  bannerImage: string | null;
  description: string | null;
  format: string | null;
  status: string | null;
  episodes: number | null;
  averageScore: number | null;
  genres: string[];
  seasonYear: number | null;
};

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { large color }
  bannerImage
  description(asHtml: false)
  format
  status
  episodes
  averageScore
  genres
  seasonYear
`;

class AnilistError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function anilistFetch<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    // Cache identical queries for an hour; anime metadata rarely changes minute to minute.
    next: { revalidate: 3600 },
  });

  const json = await res.json();

  if (!res.ok || json.errors) {
    const message = json.errors?.[0]?.message ?? `AniList request failed (${res.status})`;
    throw new AnilistError(message, res.status);
  }

  return json.data as T;
}

export async function searchAnime(search: string, page = 1, perPage = 20) {
  const query = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage hasNextPage }
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
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

export async function getAnimeById(id: number): Promise<AnilistMedia | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
      }
    }
  `;
  const data = await anilistFetch<{ Media: AnilistMedia | null }>(query, { id });
  return data.Media;
}

export async function getAnimeByIds(ids: number[]): Promise<AnilistMedia[]> {
  if (ids.length === 0) return [];
  const query = `
    query ($ids: [Int]) {
      Page(perPage: ${ids.length}) {
        media(id_in: $ids, type: ANIME) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch<{ Page: { media: AnilistMedia[] } }>(query, { ids });
  return data.Page.media;
}

export async function getTrendingAnime(page = 1, perPage = 20) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage hasNextPage }
        media(type: ANIME, sort: TRENDING_DESC) {
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

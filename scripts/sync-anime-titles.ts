// One-time (and periodically re-runnable) sync of AniList's anime title
// catalog into our local AnimeTitle table, so Browse search can do real
// substring matching instead of relying on AniList's own fuzzy search
// (which returns nothing for short fragments like "toni").
//
// Run with: npx tsx scripts/sync-anime-titles.ts
//
// Paces requests conservatively to stay well under AniList's rate limit.
import { prisma } from "../src/lib/prisma";

const ANILIST_URL = "https://graphql.anilist.co";
const PER_PAGE = 50;
const DELAY_MS = 3000;
const START_PAGE = Number(process.argv[2] ?? "1");

const QUERY = `
  query ($page: Int) {
    Page(page: $page, perPage: ${PER_PAGE}) {
      pageInfo { hasNextPage currentPage lastPage }
      media(type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
        id
        title { romaji english native }
        popularity
      }
    }
  }
`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// null return means "this is the natural end of what AniList's Page
// endpoint will give us" (their hard 5,000-entry depth cap), not a failure.
async function fetchPage(page: number, attempt = 1): Promise<{
  pageInfo: { hasNextPage: boolean; currentPage: number; lastPage: number };
  media: { id: number; title: { romaji: string | null; english: string | null; native: string | null }; popularity: number | null }[];
} | null> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { page } }),
  });

  if (res.status === 429) {
    if (attempt > 5) throw new Error(`AniList still rate-limiting page ${page} after ${attempt} attempts`);
    const retryAfter = Number(res.headers.get("retry-after")) || 10;
    const backoff = retryAfter * 1000 + attempt * 2000;
    console.log(`rate limited on page ${page}, waiting ${backoff}ms (attempt ${attempt})`);
    await sleep(backoff);
    return fetchPage(page, attempt + 1);
  }

  const json = await res.json();
  if (json.errors?.some((e: { message: string }) => e.message.includes("Page depth exceeds maximum"))) {
    return null; // hit AniList's hard 5,000-entry window — nothing more to fetch
  }
  if (!res.ok || json.errors) {
    throw new Error(`AniList error on page ${page}: ${JSON.stringify(json.errors ?? res.status)}`);
  }
  return json.data.Page;
}

async function main() {
  let page = START_PAGE;
  let total = 0;
  let lastPage = "?";

  while (true) {
    const data = await fetchPage(page);
    if (!data) {
      console.log(`Reached AniList's page-depth limit at page ${page} — nothing more to fetch.`);
      break;
    }
    lastPage = String(data.pageInfo.lastPage);

    await prisma.$transaction(
      data.media.map((m) =>
        prisma.animeTitle.upsert({
          where: { anilistId: m.id },
          create: {
            anilistId: m.id,
            romaji: m.title.romaji,
            english: m.title.english,
            native: m.title.native,
            popularity: m.popularity ?? 0,
          },
          update: {
            romaji: m.title.romaji,
            english: m.title.english,
            native: m.title.native,
            popularity: m.popularity ?? 0,
          },
        }),
      ),
    );

    total += data.media.length;
    console.log(`page ${page}/${lastPage} — ${total} titles synced so far`);

    if (!data.pageInfo.hasNextPage) break;
    page++;
    await sleep(DELAY_MS);
  }

  console.log(`Done. ${total} titles synced.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

// Read-through cache in front of the AniList client. First request for a
// given anime hits AniList and stores the result in AnimeCache; every later
// request (from any user, until it goes stale) is served from Postgres
// instead. This is what keeps us well under AniList's rate limit as the
// number of users grows — the DB, not their API, absorbs repeat traffic.
//
// Two shapes share this one table: the full detail shape (characters,
// relations, studios — used by the anime detail page) and the lighter card
// shape (title/cover/genres/score — used by Browse/Seasonal/Profile/search,
// which never render the detail-only fields anyway and would otherwise pull
// a lot of payload they immediately throw away). A cached row can hold
// either shape at a given time; isDetailShape() tells them apart so a
// detail-page request never silently serves a light-only row missing its
// cast data — it treats that as a miss and re-fetches full, upgrading the
// row. A card request is happy with either shape, since full is a superset.
//
// Server-only: imports Prisma directly. Never import this from a "use
// client" component (import the plain types from "@/lib/anilist" instead).
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  getAnimeById as fetchAnimeById,
  getAnimeByIds as fetchAnimeByIds,
  getAnimeCardsByIds as fetchAnimeCardsByIds,
} from "@/lib/anilist";
import type { AnilistMedia, AnilistMediaDetail } from "@/lib/anilist";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function isFresh(fetchedAt: Date): boolean {
  return Date.now() - fetchedAt.getTime() < CACHE_TTL_MS;
}

function isDetailShape(data: AnilistMedia | AnilistMediaDetail): data is AnilistMediaDetail {
  return "characters" in data;
}

async function readCached(
  ids: number[],
): Promise<Map<number, { data: AnilistMedia | AnilistMediaDetail; fetchedAt: Date }>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.animeCache.findMany({ where: { anilistId: { in: ids } } });
  return new Map(
    rows.map((r) => [
      r.anilistId,
      { data: r.data as unknown as AnilistMedia | AnilistMediaDetail, fetchedAt: r.fetchedAt },
    ]),
  );
}

async function writeCached(entries: (AnilistMedia | AnilistMediaDetail)[]): Promise<void> {
  if (entries.length === 0) return;

  // One bulk upsert instead of N individual round trips — matters for a
  // big list (a 1000-anime Profile's first cold-cache load previously
  // fired 1000 concurrent upserts). Also fixes a real bug the old
  // upsert() form had: its `update` clause never touched `fetchedAt`, so
  // once a row crossed the 6h TTL once, isFresh() would stay false for it
  // forever — every later read would refetch from AniList indefinitely,
  // even though we'd just written fresh data. This explicitly bumps
  // fetchedAt on every write, refresh included.
  //
  // Uses the app's own clock (`now`, passed in) rather than the DB's SQL
  // now() — verified locally that Postgres's now() can drift hours off
  // from Node's Date.now() (container clock/timezone config), which would
  // silently shrink the effective TTL. isFresh() below compares against
  // Date.now(), so the write timestamp needs to come from that same clock.
  const now = new Date();
  const rows = entries.map(
    (entry) => Prisma.sql`(${entry.id}, ${JSON.stringify(entry)}::jsonb, ${now}, ${now})`,
  );
  await prisma.$executeRaw`
    INSERT INTO "AnimeCache" ("anilistId", "data", "fetchedAt", "updatedAt")
    VALUES ${Prisma.join(rows)}
    ON CONFLICT ("anilistId") DO UPDATE
      SET "data" = EXCLUDED."data", "fetchedAt" = ${now}, "updatedAt" = ${now}
  `;
}

// Wrapped in React's cache() so a page and its generateMetadata calling
// this with the same id (same render pass) share one fetch instead of two.
export const getCachedAnimeById = cache(async function getCachedAnimeById(
  id: number,
): Promise<AnilistMediaDetail | null> {
  const cached = await readCached([id]);
  const hit = cached.get(id);
  if (hit && isFresh(hit.fetchedAt) && isDetailShape(hit.data)) return hit.data;

  try {
    const fresh = await fetchAnimeById(id);
    if (fresh) await writeCached([fresh]);
    else if (!fresh && hit) return null; // AniList confirms it no longer exists; drop the stale read as a miss too.
    return fresh;
  } catch (err) {
    // AniList hiccup (rate limit, network blip) — serve stale full-detail
    // data rather than a broken page, if we have any. A light-shaped stale
    // hit can't stand in here (no cast/relations to show), so it's not a
    // usable fallback — same as having no hit at all.
    if (hit && isDetailShape(hit.data)) return hit.data;
    throw err;
  }
});

export async function getCachedAnimeByIds(ids: number[]): Promise<AnilistMediaDetail[]> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];

  const cached = await readCached(uniqueIds);
  const fresh: AnilistMediaDetail[] = [];
  const staleOrMissing: number[] = [];

  for (const id of uniqueIds) {
    const hit = cached.get(id);
    if (hit && isFresh(hit.fetchedAt) && isDetailShape(hit.data)) fresh.push(hit.data);
    else staleOrMissing.push(id);
  }

  if (staleOrMissing.length > 0) {
    try {
      const refetched = await fetchAnimeByIds(staleOrMissing);
      await writeCached(refetched);
      fresh.push(...refetched);

      // Any id AniList didn't return (removed, or a transient gap) but we
      // have a stale copy of: better to show stale than to drop it silently.
      const returnedIds = new Set(refetched.map((m) => m.id));
      for (const id of staleOrMissing) {
        const hit = cached.get(id);
        if (!returnedIds.has(id) && hit && isDetailShape(hit.data)) fresh.push(hit.data);
      }
    } catch {
      // Whole batch failed (rate limit, outage) — fall back to whatever
      // stale full-detail copies we have rather than failing the page
      // entirely (a light-shaped stale copy still can't show cast data,
      // so it's not a usable fallback here).
      for (const id of staleOrMissing) {
        const hit = cached.get(id);
        if (hit && isDetailShape(hit.data)) fresh.push(hit.data);
      }
    }
  }

  const byId = new Map(fresh.map((m) => [m.id, m]));
  return uniqueIds.map((id) => byId.get(id)).filter((m): m is AnilistMediaDetail => m != null);
}

// Light card-only variants — for Browse/Seasonal/Profile/search-style
// views. Any cached shape (light or full) counts as a hit, since full is a
// superset of the card fields; only freshness matters here.
export const getCachedAnimeCardById = cache(async function getCachedAnimeCardById(
  id: number,
): Promise<AnilistMedia | null> {
  const cached = await readCached([id]);
  const hit = cached.get(id);
  if (hit && isFresh(hit.fetchedAt)) return hit.data;

  try {
    const [fresh] = await fetchAnimeCardsByIds([id]);
    if (fresh) await writeCached([fresh]);
    else if (hit) return null;
    return fresh ?? null;
  } catch (err) {
    if (hit) return hit.data;
    throw err;
  }
});

export async function getCachedAnimeCardsByIds(ids: number[]): Promise<AnilistMedia[]> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];

  const cached = await readCached(uniqueIds);
  const fresh: AnilistMedia[] = [];
  const staleOrMissing: number[] = [];

  for (const id of uniqueIds) {
    const hit = cached.get(id);
    if (hit && isFresh(hit.fetchedAt)) fresh.push(hit.data);
    else staleOrMissing.push(id);
  }

  if (staleOrMissing.length > 0) {
    try {
      const refetched = await fetchAnimeCardsByIds(staleOrMissing);
      await writeCached(refetched);
      fresh.push(...refetched);

      const returnedIds = new Set(refetched.map((m) => m.id));
      for (const id of staleOrMissing) {
        const hit = cached.get(id);
        if (!returnedIds.has(id) && hit) fresh.push(hit.data);
      }
    } catch {
      for (const id of staleOrMissing) {
        const hit = cached.get(id);
        if (hit) fresh.push(hit.data);
      }
    }
  }

  const byId = new Map(fresh.map((m) => [m.id, m]));
  return uniqueIds.map((id) => byId.get(id)).filter((m): m is AnilistMedia => m != null);
}

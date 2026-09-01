// Read-through cache in front of the AniList client. First request for a
// given anime hits AniList and stores the result in AnimeCache; every later
// request (from any user, until it goes stale) is served from Postgres
// instead. This is what keeps us well under AniList's rate limit as the
// number of users grows — the DB, not their API, absorbs repeat traffic.
//
// Server-only: imports Prisma directly. Never import this from a "use
// client" component (import the plain types from "@/lib/anilist" instead).
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getAnimeById as fetchAnimeById, getAnimeByIds as fetchAnimeByIds } from "@/lib/anilist";
import type { AnilistMediaDetail } from "@/lib/anilist";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function isFresh(fetchedAt: Date): boolean {
  return Date.now() - fetchedAt.getTime() < CACHE_TTL_MS;
}

async function readCached(ids: number[]): Promise<Map<number, { data: AnilistMediaDetail; fetchedAt: Date }>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.animeCache.findMany({ where: { anilistId: { in: ids } } });
  return new Map(rows.map((r) => [r.anilistId, { data: r.data as unknown as AnilistMediaDetail, fetchedAt: r.fetchedAt }]));
}

async function writeCached(entries: AnilistMediaDetail[]): Promise<void> {
  if (entries.length === 0) return;
  await Promise.all(
    entries.map((entry) =>
      prisma.animeCache.upsert({
        where: { anilistId: entry.id },
        create: { anilistId: entry.id, data: entry as never },
        update: { data: entry as never },
      }),
    ),
  );
}

// Wrapped in React's cache() so a page and its generateMetadata calling
// this with the same id (same render pass) share one fetch instead of two.
export const getCachedAnimeById = cache(async function getCachedAnimeById(
  id: number,
): Promise<AnilistMediaDetail | null> {
  const cached = await readCached([id]);
  const hit = cached.get(id);
  if (hit && isFresh(hit.fetchedAt)) return hit.data;

  try {
    const fresh = await fetchAnimeById(id);
    if (fresh) await writeCached([fresh]);
    else if (!fresh && hit) return null; // AniList confirms it no longer exists; drop the stale read as a miss too.
    return fresh;
  } catch (err) {
    // AniList hiccup (rate limit, network blip) — serve stale data rather
    // than a broken page, if we have anything at all.
    if (hit) return hit.data;
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
    if (hit && isFresh(hit.fetchedAt)) fresh.push(hit.data);
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
        if (!returnedIds.has(id) && cached.has(id)) fresh.push(cached.get(id)!.data);
      }
    } catch {
      // Whole batch failed (rate limit, outage) — fall back to whatever
      // stale copies we have rather than failing the page entirely.
      for (const id of staleOrMissing) {
        const hit = cached.get(id);
        if (hit) fresh.push(hit.data);
      }
    }
  }

  const byId = new Map(fresh.map((m) => [m.id, m]));
  return uniqueIds.map((id) => byId.get(id)).filter((m): m is AnilistMediaDetail => m != null);
}

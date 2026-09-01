// Server-only. Real substring search over a locally-synced mirror of
// AniList's title catalog (see prisma AnimeTitle + scripts/sync-anime-titles.ts).
// AniList's own `search` field can't do this reliably — it's a fuzzy/
// similarity search that returns nothing for short fragments.
import { prisma } from "@/lib/prisma";

// AniList caps any single id_in lookup at 50 results (confirmed against
// their API — requesting more just gets silently clamped), so a search
// "page" is naturally bounded to 50 candidates, ranked by relevance then
// popularity.
const MAX_CANDIDATES = 50;

export async function searchLocalTitleIds(query: string): Promise<number[]> {
  const q = query.trim();
  if (!q) return [];

  const rows = await prisma.$queryRaw<{ anilistId: number; rank: number }[]>`
    SELECT
      "anilistId",
      CASE
        WHEN romaji ILIKE ${q + "%"} OR english ILIKE ${q + "%"} OR native ILIKE ${q + "%"} THEN 0
        ELSE 1
      END AS rank
    FROM "AnimeTitle"
    WHERE romaji ILIKE ${"%" + q + "%"}
       OR english ILIKE ${"%" + q + "%"}
       OR native ILIKE ${"%" + q + "%"}
    ORDER BY rank ASC, popularity DESC
    LIMIT ${MAX_CANDIDATES}
  `;

  return rows.map((r) => r.anilistId);
}

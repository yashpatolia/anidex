import { NextRequest, NextResponse } from "next/server";
import { searchLocalTitleIds } from "@/lib/anime-title-index";
import { getCachedAnimeByIds } from "@/lib/anime-cache";

// GET /api/search/quick?q=... — top 5 closest matches for the nav search
// dropdown. Backed by our local title index (real substring search), not
// AniList's own fuzzy `search` field, which returns nothing for short
// fragments like "toni".
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  try {
    const ids = await searchLocalTitleIds(q);
    const media = await getCachedAnimeByIds(ids.slice(0, 5));
    // getCachedAnimeByIds doesn't preserve relevance order — restore it.
    const byId = new Map(media.map((m) => [m.id, m]));
    const results = ids
      .slice(0, 5)
      .map((id) => byId.get(id))
      .filter((m) => m != null)
      .map((m) => ({
        id: m.id,
        title: m.title.english ?? m.title.romaji ?? m.title.native ?? "Untitled",
        coverImage: m.coverImage.large,
        genres: m.genres.slice(0, 3),
      }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Quick search failed", err);
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}

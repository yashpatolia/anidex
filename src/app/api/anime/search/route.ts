import { NextRequest, NextResponse } from "next/server";
import { searchAnime, getTrendingAnime } from "@/lib/anilist";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const page = Number(searchParams.get("page") ?? "1") || 1;

  try {
    // No query -> trending, so the browse page has something to show by default.
    const result = q ? await searchAnime(q, page) : await getTrendingAnime(page);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Anime search failed", err);
    return NextResponse.json({ error: "Failed to fetch anime data" }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCachedAnimeById } from "@/lib/anime-cache";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const anilistId = Number(id);
  if (!Number.isInteger(anilistId)) {
    return NextResponse.json({ error: "Invalid anime id" }, { status: 400 });
  }

  try {
    const media = await getCachedAnimeById(anilistId);
    if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(media);
  } catch (err) {
    console.error("Anime fetch failed", err);
    return NextResponse.json({ error: "Failed to fetch anime data" }, { status: 502 });
  }
}

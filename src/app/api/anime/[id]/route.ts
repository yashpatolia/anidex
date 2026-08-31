import { NextRequest, NextResponse } from "next/server";
import { getAnimeById } from "@/lib/anilist";

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
    const media = await getAnimeById(anilistId);
    if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(media);
  } catch (err) {
    console.error("AniList fetch failed", err);
    return NextResponse.json({ error: "Failed to fetch from AniList" }, { status: 502 });
  }
}

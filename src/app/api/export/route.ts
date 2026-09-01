import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { getCachedAnimeCardsByIds } from "@/lib/anime-cache";

// GET /api/export?format=json|csv — download the signed-in user's own list.
// Read-only, scoped to userId, no new schema. Row shape is deliberately the
// same one import's preview/commit routes use (anilistId/status/score/
// progress), so this can double as the fixture format for testing import.
function csvCell(value: string | number | null): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";

  const entries = await prisma.animeListEntry.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const media = await getCachedAnimeCardsByIds(entries.map((e) => e.anilistId));
  const mediaById = new Map(media.map((m) => [m.id, m]));

  const rows = entries.map((e) => {
    const anime = mediaById.get(e.anilistId);
    const title = anime?.title.english ?? anime?.title.romaji ?? anime?.title.native ?? null;
    return {
      anilistId: e.anilistId,
      title,
      status: e.status,
      score: e.score,
      progress: e.progress,
      episodes: anime?.episodes ?? null,
      notes: e.notes,
      updatedAt: e.updatedAt.toISOString(),
    };
  });

  const date = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const header = ["anilistId", "title", "status", "score", "progress", "episodes", "notes", "updatedAt"];
    const lines = [
      header.join(","),
      ...rows.map((r) => header.map((key) => csvCell(r[key as keyof typeof r])).join(",")),
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="anidex-export-${date}.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(rows, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="anidex-export-${date}.json"`,
    },
  });
}

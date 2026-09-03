import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { getAnimeCardsByIds, getAnilistUserList } from "@/lib/anilist";
import { ANILIST_STATUS_TO_OURS } from "@/lib/anilist-shared";

// GET /api/export?format=json|csv — download the signed-in user's own list,
// straight from AniList (the only place it lives now — see
// anilist-client.ts's file comment). Row shape is deliberately the same one
// import's preview/commit routes use (anilistId/status/score/progress), so
// this can double as the fixture format for testing import.
//
// Stayed server-side deliberately (unlike Browse/Seasonal/etc.): this is a
// one-time, explicit, user-initiated action, not routine browsing traffic
// — same reasoning as import/resolve.ts's live fallback. Uses
// src/lib/anilist.ts, which is a live, uncached pass-through (no
// server-side storage).
function csvCell(value: string | number | null): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const entries = user?.name ? await getAnilistUserList(user.name) : [];

  const media = await getAnimeCardsByIds(entries.map((e) => e.anilistId));
  const mediaById = new Map(media.map((m) => [m.id, m]));

  const rows = entries.map((e) => {
    const anime = mediaById.get(e.anilistId);
    const title = anime?.title.english ?? anime?.title.romaji ?? anime?.title.native ?? null;
    return {
      anilistId: e.anilistId,
      title,
      status: ANILIST_STATUS_TO_OURS[e.status] ?? "PLANNED",
      score: e.score,
      progress: e.progress,
      episodes: anime?.episodes ?? null,
    };
  });

  const date = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const header = ["anilistId", "title", "status", "score", "progress", "episodes"];
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

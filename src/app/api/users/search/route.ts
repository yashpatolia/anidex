import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { searchPublicUsers } from "@/lib/follows";

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchPublicUsers(q, userId);
  return NextResponse.json({ results });
}

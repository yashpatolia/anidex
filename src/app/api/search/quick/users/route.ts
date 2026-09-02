import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchPublicUsers } from "@/lib/follows";

const USER_RESULT_LIMIT = 5;

// GET /api/search/quick/users?q=... — public users matching the nav
// search's "Search people" button. Separate from /api/search/quick (anime)
// so a plain anime search never pays for this query — it only runs once
// that button is actually clicked. Open to signed-out visitors too (public
// profiles are visible to anyone); `isFollowing` just never comes back true
// for them.
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ users: [] });

  const session = await auth();
  const users = await searchPublicUsers(q, session?.user?.id, USER_RESULT_LIMIT);
  return NextResponse.json({ users });
}

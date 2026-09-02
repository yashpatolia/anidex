import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { syncEpisodeNotifications, getNotifications } from "@/lib/notifications";

// Bell-open endpoint: syncs first (checks the user's Watching/Rewatching
// list against AniList's airing data, inserting any newly-aired episodes),
// then returns the up-to-date list. See src/lib/notifications.ts.
export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  await syncEpisodeNotifications(userId);
  const { items, unreadCount } = await getNotifications(userId);
  return NextResponse.json({ items, unreadCount });
}

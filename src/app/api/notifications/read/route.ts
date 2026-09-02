import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notifications";

const bodySchema = z.union([z.object({ id: z.string() }), z.object({ all: z.literal(true) })]);

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if ("all" in parsed.data) {
    await markAllNotificationsRead(userId);
  } else {
    await markNotificationRead(userId, parsed.data.id);
  }
  return NextResponse.json({ ok: true });
}

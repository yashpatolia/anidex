import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * For use at the top of API route handlers. Returns the signed-in user's id,
 * or a 401 NextResponse to return immediately.
 */
export async function requireUserId(): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session.user.id;
}

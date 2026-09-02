import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// /profile is just a stable, username-independent link to "my own list" —
// the actual page lives at /u/[username] (src/app/u/[username]/page.tsx),
// which already renders the owner's copy in full (with edit chrome) even
// while the profile is set to private. Redirecting here instead of
// duplicating that page keeps there being exactly one profile page.
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });
  // Every account gets a username at signup (or by the one-time backfill),
  // so this should never be null in practice — /account is a safe fallback
  // if it somehow is.
  if (!user?.username) redirect("/account");

  redirect(`/u/${user.username}`);
}

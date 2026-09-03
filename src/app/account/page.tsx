import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountView } from "@/components/account-view";

export const metadata: Metadata = {
  title: "Account",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      bio: true,
      email: true,
      username: true,
      usernameAutoAssigned: true,
      name: true,
      image: true,
      avatarImage: true,
      accounts: { where: { provider: "anilist" }, select: { provider: true } },
    },
  });
  if (!user) redirect("/login");

  return (
    <AccountView
      bio={user.bio}
      email={user.email}
      username={user.username}
      usernameAutoAssigned={user.usernameAutoAssigned}
      // AniList's Viewer.name (their AniList username) is stored as our
      // User.name on sign-in — see the profile() mapping in auth.ts.
      anilistUsername={user.accounts.length > 0 ? user.name : null}
      avatarSrc={user.avatarImage ?? user.image}
      hasCustomAvatar={user.avatarImage != null}
    />
  );
}

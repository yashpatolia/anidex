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
      name: true,
      bio: true,
      email: true,
      username: true,
      usernameAutoAssigned: true,
      passwordHash: true,
      accounts: { select: { provider: true } },
    },
  });
  if (!user) redirect("/login");

  return (
    <AccountView
      name={user.name}
      bio={user.bio}
      email={user.email}
      username={user.username}
      usernameAutoAssigned={user.usernameAutoAssigned}
      hasPassword={user.passwordHash != null}
      providers={user.accounts.map((a) => a.provider)}
    />
  );
}

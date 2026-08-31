import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6">
        <p>Not signed in.</p>
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </main>
    );
  }

  const entries = await prisma.animeListEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <p>Signed in as {session.user.email}</p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="underline">Sign out</button>
        </form>
      </div>

      <h1 className="text-xl font-medium">Your list ({entries.length})</h1>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id} className="flex justify-between rounded border px-3 py-2">
            <span>AniList #{entry.anilistId}</span>
            <span className="text-neutral-500">
              {entry.status} · ep {entry.progress} · {entry.score ?? "—"}/10
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}

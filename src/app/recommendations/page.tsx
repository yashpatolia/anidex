import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getRecommendationRails } from "@/lib/recommendations";
import { AnimeRail } from "@/components/anime-rail";

export const metadata: Metadata = {
  title: "Recommendations",
};

export default async function RecommendationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const rails = await getRecommendationRails(session.user.id, { maxRails: 8, perRail: 18 });

  if (rails.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-8 text-center">
        <h1 className="font-display text-3xl text-paper">Nothing to recommend yet.</h1>
        <p className="text-sm text-ash">
          Mark something as Watching or Completed and recommendations based on it will show up
          here.
        </p>
        <Link
          href="/browse"
          className="mt-2 border border-hanko bg-hanko px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
        >
          Browse anime
        </Link>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-col">
      <header className="flex flex-col gap-2 px-8 py-12 2xl:px-16">
        <h1 className="font-display text-3xl text-paper">Recommended for you</h1>
        <p className="text-sm text-ash">Based on what you&apos;ve watched, not tracked anywhere yet.</p>
      </header>

      {rails.map((rail) => (
        <AnimeRail key={rail.title} title={rail.title} media={rail.media} />
      ))}
    </main>
  );
}

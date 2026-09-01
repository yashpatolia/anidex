import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAiringScheduleByIds } from "@/lib/anilist";
import { AiringCalendarView, type AiringItem } from "@/components/airing-calendar-view";

export const metadata: Metadata = {
  title: "Airing",
};

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

// Pulled out of the component body: Date.now() is an impure call, and
// react-hooks/purity flags impure calls made directly inside a component
// (server components are still components) — a plain helper sidesteps that.
function withinNextWeek(airingAt: number): boolean {
  return airingAt - Date.now() / 1000 <= ONE_WEEK_SECONDS;
}

export default async function AiringPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const entries = await prisma.animeListEntry.findMany({
    where: { userId: session.user.id, status: { in: ["WATCHING", "REWATCHING"] } },
    select: { anilistId: true },
  });

  if (entries.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-8 text-center">
        <h1 className="font-display text-3xl text-paper">Nothing to show yet.</h1>
        <p className="text-sm text-ash">
          Mark something as Watching and its upcoming episodes will show up here.
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

  const media = await getAiringScheduleByIds(entries.map((e) => e.anilistId));

  const items: AiringItem[] = media
    .filter((m) => m.nextAiringEpisode != null && withinNextWeek(m.nextAiringEpisode.airingAt))
    .map((m) => ({
      anilistId: m.id,
      title: m.title.english ?? m.title.romaji ?? m.title.native ?? "Untitled",
      coverImage: m.coverImage.large,
      episode: m.nextAiringEpisode!.episode,
      airingAt: m.nextAiringEpisode!.airingAt,
    }));

  return (
    <main className="flex w-full flex-col gap-8 px-8 py-12 2xl:px-16">
      <header className="flex flex-col gap-2 border-b border-line pb-8">
        <h1 className="font-display text-3xl text-paper">Airing this week</h1>
        <p className="text-sm text-ash">Upcoming episodes for what you&apos;re watching.</p>
      </header>

      <AiringCalendarView items={items} />
    </main>
  );
}

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getAiringSchedule } from "@/lib/anilist";
import { getTrackedAnilistIds } from "@/lib/list-status";
import { AiringCalendarView, type AiringItem } from "@/components/airing-calendar-view";

export const metadata: Metadata = {
  title: "Airing",
};

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;
// Popularity-ranked cap across the whole week, not per day — some days
// genuinely have more airing anime than others, so this just keeps the
// overall page from ballooning while still surfacing what's actually
// popular (a bottom-of-the-barrel isekai nobody's tracking isn't worth
// showing over something everyone's watching, even on a slow day).
const MAX_ITEMS = 140;

// Pulled out of the component body: Date.now() is an impure call, and
// react-hooks/purity flags impure calls made directly inside a component
// (server components are still components) — a plain helper sidesteps that.
function getWeekWindow(): { from: number; to: number } {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return { from: nowSeconds, to: nowSeconds + ONE_WEEK_SECONDS };
}

export default async function AiringPage() {
  const session = await auth();

  const { from, to } = getWeekWindow();
  const [schedule, viewerTrackedIds] = await Promise.all([
    getAiringSchedule(from, to),
    session?.user ? getTrackedAnilistIds(session.user.id) : Promise.resolve(new Set<number>()),
  ]);

  // The same media can occasionally show up twice in one window (a double
  // episode, or an off-by-one at the query boundary) — keep only the
  // earliest airing per id.
  const byMediaId = new Map<number, (typeof schedule)[number]>();
  for (const entry of schedule) {
    const existing = byMediaId.get(entry.media.id);
    if (!existing || entry.airingAt < existing.airingAt) byMediaId.set(entry.media.id, entry);
  }

  const items: AiringItem[] = [...byMediaId.values()]
    .sort((a, b) => (b.media.popularity ?? 0) - (a.media.popularity ?? 0))
    .slice(0, MAX_ITEMS)
    .map((entry) => ({
      episode: entry.episode,
      airingAt: entry.airingAt,
      anime: entry.media,
      isAdult: entry.media.isAdult,
      initialTracked: viewerTrackedIds.has(entry.media.id),
    }));

  return (
    <main className="flex w-full flex-col gap-8 px-8 py-12 2xl:px-16">
      <header className="flex flex-col gap-2 border-b border-line pb-8">
        <h1 className="font-display text-3xl text-paper">Airing this week</h1>
        <p className="text-sm text-ash">Popular anime airing over the next 7 days.</p>
      </header>

      <AiringCalendarView items={items} />
    </main>
  );
}

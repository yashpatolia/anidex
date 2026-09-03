import type { Metadata } from "next";
import { getCurrentSeason, SEASONS } from "@/lib/anilist-shared";
import { SeasonalSwitcher } from "@/components/seasonal-switcher";
import { SeasonalView } from "@/components/seasonal-view";

export const metadata: Metadata = {
  title: "Seasonal",
};

// No server-side AniList fetching anymore — the header needs season/year
// from the URL (or today's date) to render its own label, but the actual
// results are entirely client-fetched; see seasonal-view.tsx.
export default async function SeasonalPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; year?: string; page?: string }>;
}) {
  const params = await searchParams;
  const current = getCurrentSeason();
  const season = params.season || current.season;
  const year = params.year ? Number(params.year) : current.year;
  const page = Number(params.page ?? "1") || 1;
  const seasonLabel = SEASONS.find((s) => s.value === season)?.label ?? season;

  return (
    <main className="flex w-full flex-col gap-8 px-8 py-12 2xl:px-16">
      <header className="flex flex-col gap-6 border-b border-line pb-8">
        <h1 className="font-display text-3xl text-paper">
          {seasonLabel} {year}
        </h1>
        <SeasonalSwitcher season={season} year={year} />
      </header>

      <SeasonalView season={season} year={year} page={page} />
    </main>
  );
}

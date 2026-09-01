"use client";

import { useRouter } from "next/navigation";
import { SEASONS } from "@/lib/anilist";
import { FilterSelect } from "@/components/filter-select";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR + 1 - i);

export function SeasonalSwitcher({ season, year }: { season: string; year: number }) {
  const router = useRouter();

  function update(nextSeason: string, nextYear: string) {
    router.push(`/seasonal?season=${nextSeason}&year=${nextYear}`);
  }

  return (
    <div className="flex gap-4">
      <FilterSelect
        label="Season"
        options={[...SEASONS]}
        value={season}
        onChange={(v) => update(v, String(year))}
        allowAll={false}
      />
      <FilterSelect
        label="Year"
        options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
        value={String(year)}
        onChange={(v) => update(season, v)}
        allowAll={false}
      />
    </div>
  );
}

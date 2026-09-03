"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BROWSE_GENRES, BROWSE_FORMATS, BROWSE_STATUSES, BROWSE_SORTS } from "@/lib/anilist-client";
import { FilterSelect } from "@/components/filter-select";
import { FilterMultiSelect } from "@/components/filter-multi-select";
import { FilterYearRange } from "@/components/filter-year-range";

const MIN_SCORES = [90, 80, 70, 60];

function parseList(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export function BrowseFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function update(updates: Record<string, string | string[] | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        params.delete(key);
      } else {
        params.set(key, Array.isArray(value) ? value.join(",") : value);
      }
    }
    params.delete("page");
    router.push(`/browse?${params.toString()}`);
  }

  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (search === current) return;
    const id = setTimeout(() => update({ search }), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const genreOptions = BROWSE_GENRES.map((g) => ({ value: g, label: g }));
  const scoreOptions = MIN_SCORES.map((s) => ({ value: String(s), label: `${s}+` }));

  return (
    <div className="flex flex-col gap-5">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search anime"
        className="w-full max-w-sm border-b border-line bg-transparent py-2 font-body text-lg text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
      />

      <div className="flex flex-wrap gap-4">
        <FilterMultiSelect
          label="Genre"
          options={genreOptions}
          values={parseList(searchParams.get("genre"))}
          onChange={(v) => update({ genre: v })}
        />
        <FilterYearRange
          from={searchParams.get("yearFrom") ?? ""}
          to={searchParams.get("yearTo") ?? ""}
          onChange={(from, to) => update({ yearFrom: from, yearTo: to })}
        />
        <FilterMultiSelect
          label="Format"
          options={[...BROWSE_FORMATS]}
          values={parseList(searchParams.get("format"))}
          onChange={(v) => update({ format: v })}
        />
        <FilterMultiSelect
          label="Status"
          options={[...BROWSE_STATUSES]}
          values={parseList(searchParams.get("status"))}
          onChange={(v) => update({ status: v })}
        />
        <FilterSelect
          label="Min score"
          options={scoreOptions}
          value={searchParams.get("minScore") ?? ""}
          onChange={(v) => update({ minScore: v })}
        />
        <FilterSelect
          label="Sort by"
          options={[...BROWSE_SORTS]}
          value={searchParams.get("sort") ?? ""}
          onChange={(v) => update({ sort: v })}
        />
      </div>
    </div>
  );
}

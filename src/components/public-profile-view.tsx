"use client";

import { useMemo, useState } from "react";
import { AnimeCard } from "@/components/anime-card";
import { AnimeListRow } from "@/components/anime-list-row";
import { SortSelect } from "@/components/sort-select";
import { SECTION_LABELS, type ProfilePrefs, type SectionKey } from "@/lib/profile-prefs";
import {
  COMPACT_COLS,
  GRID_COLS,
  SORT_MODES,
  VIEW_MODES,
  sortEntries,
  type ListEntry as Entry,
  type ListStats as Stats,
  type SortMode,
  type ViewMode,
} from "@/lib/list-view";

// Read-only counterpart to ProfileView: same grouped/sortable/searchable
// grid, none of the owner-only chrome (Customize, Import, Export, editing
// name/bio/prefs). The owner's accent color and section order/visibility
// still apply — it's their page, this is just not their editing surface.
export function PublicProfileView({
  username,
  bio,
  prefs,
  entries,
  stats,
  viewerTrackedIds,
}: {
  username: string;
  bio: string | null;
  prefs: ProfilePrefs;
  entries: Entry[];
  stats: Stats;
  // The current *viewer's* own tracked anime, not the profile owner's — a
  // signed-in visitor can still quick-add anything they see here to their
  // own list, same as Browse/Seasonal, without it implying anything about
  // whether the owner has it tracked (they obviously do, it's their entry).
  viewerTrackedIds: Set<number>;
}) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("titleAsc");

  const maxGenreCount = stats.topGenres[0]?.[1] ?? 1;

  const grouped = useMemo(() => {
    const map = new Map<SectionKey, Entry[]>();
    for (const entry of entries) {
      const key: SectionKey = entry.status === "REWATCHING" ? "WATCHING" : (entry.status as SectionKey);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return map;
  }, [entries]);

  const query = search.trim().toLowerCase();
  function matchesSearch(entry: Entry) {
    if (!query) return true;
    const title = entry.anime.title.english ?? entry.anime.title.romaji ?? entry.anime.title.native ?? "";
    return title.toLowerCase().includes(query);
  }

  return (
    <main
      className="flex w-full flex-col gap-12 px-8 py-12 2xl:px-16"
      style={{ ["--color-hanko" as string]: prefs.accentColor }}
    >
      <header className="flex flex-col gap-6 border-b border-line pb-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl text-paper">{username}&apos;s list</h1>
          {bio && <p className="max-w-md text-sm text-ash">{bio}</p>}
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <div className="flex gap-8 font-mono text-xs uppercase tracking-widest text-ash">
            {prefs.stats.total && (
              <span>
                <span className="text-paper">{stats.total}</span> tracked
              </span>
            )}
            {prefs.stats.episodes && (
              <span>
                <span className="text-paper">{stats.episodesWatched}</span> episodes
              </span>
            )}
            {prefs.stats.avgScore && stats.avgScore && (
              <span>
                <span className="text-hanko">{stats.avgScore}</span> avg score
              </span>
            )}
          </div>

          {prefs.stats.genres && stats.topGenres.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-l border-line pl-10">
              {stats.topGenres.map(([genre, count]) => (
                <span key={genre} className="flex items-center gap-1.5 font-mono text-xs text-ash">
                  {genre}
                  <span
                    className="inline-block h-1 bg-hanko"
                    style={{ width: `${8 + (count / maxGenreCount) * 24}px` }}
                  />
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${username}'s list`}
            className="w-full max-w-sm border-b border-line bg-transparent py-2 font-body text-sm text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
          />

          <div className="flex items-center gap-3">
            <SortSelect options={SORT_MODES} value={sortMode} onChange={setSortMode} />

            <div className="flex border border-line">
              {VIEW_MODES.map((m, i) => (
                <button
                  key={m.value}
                  type="button"
                  aria-label={m.label}
                  aria-pressed={viewMode === m.value}
                  title={m.label}
                  onClick={() => setViewMode(m.value)}
                  className={`flex h-8 w-9 items-center justify-center transition-colors ${
                    i > 0 ? "border-l border-line" : ""
                  } ${viewMode === m.value ? "bg-hanko text-paper" : "text-ash hover:text-paper"}`}
                >
                  <span className="h-4 w-4">{m.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {prefs.sections
        .filter((s) => s.visible)
        .map(({ key }) => {
          const section = sortEntries((grouped.get(key) ?? []).filter(matchesSearch), sortMode);
          if (section.length === 0) return null;

          return (
            <section key={key} className="flex flex-col gap-5">
              <div className="flex items-baseline gap-3">
                <h2 className="font-display text-xl text-paper">{SECTION_LABELS[key]}</h2>
                <span className="font-mono text-xs text-ash">{section.length}</span>
              </div>

              {viewMode === "list" ? (
                <div className="flex flex-col border-t border-line">
                  {section.map((entry) => (
                    <AnimeListRow
                      key={entry.id}
                      anime={entry.anime}
                      score={entry.score}
                      progress={entry.progress}
                    />
                  ))}
                </div>
              ) : (
                <div className={viewMode === "compact" ? COMPACT_COLS : GRID_COLS}>
                  {section.map((entry) => (
                    <AnimeCard
                      key={entry.id}
                      anime={entry.anime}
                      initialTracked={viewerTrackedIds.has(entry.anime.id)}
                      score={entry.score}
                      dense={viewMode === "compact"}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

      {query && entries.every((e) => !matchesSearch(e)) && (
        <p className="py-16 text-center text-sm text-ash">Nothing in {username}&apos;s list matches &quot;{search}&quot;.</p>
      )}
    </main>
  );
}

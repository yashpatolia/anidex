"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimeCard } from "@/components/anime-card";
import { AnimeListRow } from "@/components/anime-list-row";
import { ExportMenu } from "@/components/export-menu";
import { SortSelect } from "@/components/sort-select";
import {
  ACCENT_PALETTE,
  SECTION_LABELS,
  type ProfilePrefs,
  type SectionKey,
} from "@/lib/profile-prefs";
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

export function ProfileView({
  username,
  bio,
  prefs: initialPrefs,
  entries,
  stats,
}: {
  username: string | null;
  bio: string | null;
  prefs: ProfilePrefs;
  entries: Entry[];
  stats: Stats;
}) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const displayUsername = username ?? "";
  const displayBio = bio ?? "";
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("titleAsc");
  const router = useRouter();

  // Editing an entry's score/status from the detail page calls
  // router.refresh() there, but landing back on this page via the browser's
  // own back/forward buttons restores it straight from the browser's
  // bfcache — the whole page, JS heap and all, resurrected from memory with
  // no navigation event Next's router ever sees. The one signal that does
  // fire on a bfcache restore is `pageshow` with `event.persisted === true`;
  // react to it by forcing a refetch so this page can't show stale data
  // from before whatever was just edited elsewhere.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) router.refresh();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router]);

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

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePrefs: prefs }),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function moveSection(index: number, direction: -1 | 1) {
    const next = [...prefs.sections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPrefs({ ...prefs, sections: next });
  }

  function toggleSectionVisible(key: SectionKey) {
    setPrefs({
      ...prefs,
      sections: prefs.sections.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s)),
    });
  }

  function toggleStat(key: keyof ProfilePrefs["stats"]) {
    setPrefs({ ...prefs, stats: { ...prefs.stats, [key]: !prefs.stats[key] } });
  }

  return (
    <main
      className="flex w-full flex-col gap-12 px-8 py-12 2xl:px-16"
      style={{ ["--color-hanko" as string]: prefs.accentColor }}
    >
      <header className="flex flex-col gap-6 border-b border-line pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl text-paper">
              {displayUsername ? `${displayUsername}'s list` : "Your list"}
            </h1>
            {displayBio && !editing && <p className="max-w-md text-sm text-ash">{displayBio}</p>}
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-shrink-0 sm:flex-nowrap">
            <Link
              href="/import"
              className="border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:border-hanko hover:text-hanko"
            >
              Import
            </Link>
            <ExportMenu />
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:border-hanko hover:text-hanko"
            >
              {editing ? "Close" : "Customize"}
            </button>
          </div>
        </div>

        {editing && (
          <div className="flex flex-col gap-6 border border-line p-5">
            <p className="font-mono text-[11px] text-ash">
              Username and bio moved to{" "}
              <Link href="/account" className="text-paper underline underline-offset-2 hover:text-hanko">
                Account settings
              </Link>
              .
            </p>

            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Accent color</span>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    onClick={() => setPrefs({ ...prefs, accentColor: c.value })}
                    className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c.value,
                      borderColor: prefs.accentColor === c.value ? c.value : "transparent",
                      outline: prefs.accentColor === c.value ? `2px solid ${c.value}` : "none",
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ash">
                Sections shown &amp; order
              </span>
              <div className="flex flex-col gap-1.5">
                {prefs.sections.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveSection(i, -1)}
                        disabled={i === 0}
                        className="font-mono text-[10px] text-ash transition-colors hover:text-hanko disabled:opacity-20"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(i, 1)}
                        disabled={i === prefs.sections.length - 1}
                        className="font-mono text-[10px] text-ash transition-colors hover:text-hanko disabled:opacity-20"
                      >
                        ▼
                      </button>
                    </div>
                    <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-paper">
                      <input
                        type="checkbox"
                        checked={s.visible}
                        onChange={() => toggleSectionVisible(s.key)}
                        className="accent-[color:var(--color-hanko)]"
                      />
                      {SECTION_LABELS[s.key]}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Stats shown</span>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {(
                  [
                    ["total", "Total tracked"],
                    ["episodes", "Episodes watched"],
                    ["avgScore", "Average score"],
                    ["genres", "Genre breakdown"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-paper">
                    <input
                      type="checkbox"
                      checked={prefs.stats[key]}
                      onChange={() => toggleStat(key)}
                      className="accent-[color:var(--color-hanko)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Public profile</span>
              <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-paper">
                <input
                  type="checkbox"
                  checked={prefs.isPublic}
                  onChange={() => setPrefs({ ...prefs, isPublic: !prefs.isPublic })}
                  className="accent-[color:var(--color-hanko)]"
                />
                Anyone can view this list
              </label>
              {prefs.isPublic && displayUsername && (
                <p className="font-mono text-[11px] text-ash">
                  Visible at{" "}
                  <Link
                    href={`/u/${displayUsername}`}
                    className="text-paper underline underline-offset-2 hover:text-hanko"
                  >
                    /u/{displayUsername}
                  </Link>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="self-start border border-hanko bg-hanko px-5 py-2 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}

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
            placeholder="Search your list"
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
                      initialTracked
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
        <p className="py-16 text-center text-sm text-ash">Nothing in your list matches &quot;{search}&quot;.</p>
      )}
    </main>
  );
}

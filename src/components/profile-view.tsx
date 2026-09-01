"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimeCard } from "@/components/anime-card";
import {
  ACCENT_PALETTE,
  SECTION_LABELS,
  type ProfilePrefs,
  type SectionKey,
} from "@/lib/profile-prefs";
import type { AnilistMedia } from "@/lib/anilist";

type Entry = {
  id: string;
  status: string;
  score: number | null;
  progress: number;
  anime: AnilistMedia;
};

type Stats = {
  total: number;
  episodesWatched: number;
  avgScore: string | null;
  topGenres: [string, number][];
};

export function ProfileView({
  name,
  bio,
  prefs: initialPrefs,
  entries,
  stats,
}: {
  name: string | null;
  bio: string | null;
  prefs: ProfilePrefs;
  entries: Entry[];
  stats: Stats;
}) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [displayName, setDisplayName] = useState(name ?? "");
  const [displayBio, setDisplayBio] = useState(bio ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

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
        body: JSON.stringify({ name: displayName, bio: displayBio, profilePrefs: prefs }),
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
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl text-paper">
              {displayName ? `${displayName}'s list` : "Your list"}
            </h1>
            {displayBio && !editing && <p className="max-w-md text-sm text-ash">{displayBio}</p>}
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <Link
              href="/import"
              className="border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:border-hanko hover:text-hanko"
            >
              Import
            </Link>
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
            <div className="flex flex-col gap-4 sm:flex-row">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Display name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={60}
                  className="border border-line bg-ink px-3 py-2 text-sm text-paper focus:border-hanko focus:outline-none"
                />
              </label>
              <label className="flex flex-[2] flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Bio</span>
                <input
                  value={displayBio}
                  onChange={(e) => setDisplayBio(e.target.value)}
                  maxLength={280}
                  placeholder="A line about your taste in anime"
                  className="border border-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
                />
              </label>
            </div>

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

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your list"
          className="w-full max-w-sm border-b border-line bg-transparent py-2 font-body text-sm text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
        />
      </header>

      {prefs.sections
        .filter((s) => s.visible)
        .map(({ key }) => {
          const section = (grouped.get(key) ?? []).filter(matchesSearch);
          if (section.length === 0) return null;

          return (
            <section key={key} className="flex flex-col gap-5">
              <div className="flex items-baseline gap-3">
                <h2 className="font-display text-xl text-paper">{SECTION_LABELS[key]}</h2>
                <span className="font-mono text-xs text-ash">{section.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-10">
                {section.map((entry) => (
                  <AnimeCard key={entry.id} anime={entry.anime} initialTracked />
                ))}
              </div>
            </section>
          );
        })}

      {query && entries.every((e) => !matchesSearch(e)) && (
        <p className="py-16 text-center text-sm text-ash">Nothing in your list matches &quot;{search}&quot;.</p>
      )}
    </main>
  );
}

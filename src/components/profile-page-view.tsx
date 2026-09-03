"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimeCard } from "@/components/anime-card";
import { AnimeListRow } from "@/components/anime-list-row";
import { Avatar } from "@/components/avatar";
import { ExportMenu } from "@/components/export-menu";
import { SortSelect } from "@/components/sort-select";
import { FollowButton } from "@/components/follow-button";
import { ShareButton } from "@/components/share-button";
import { ProfileCustomizePanel } from "@/components/profile-customize-panel";
import { SECTION_LABELS, type ProfilePrefs, type SectionKey } from "@/lib/profile-prefs";
import {
  COMPACT_COLS,
  GRID_COLS,
  SORT_MODES,
  VIEW_MODES,
  entryTitle,
  sortEntries,
  type ListEntry as Entry,
  type ListStats as Stats,
  type SortMode,
  type ViewMode,
} from "@/lib/list-view";

// One page for both /profile (redirects here for the signed-in user) and
// /u/[username] (anyone else, or the owner viewing their own even while
// private) — same layout and features either way. `isOwner` is the only
// thing that changes what renders: editing chrome (Customize/Import/Export)
// and always-tracked cards for the owner, a Follow button and the viewer's
// own tracked state for everyone else.
export function ProfilePageView({
  username,
  bio,
  avatarSrc,
  prefs: initialPrefs,
  entries,
  stats,
  isOwner,
  viewerTrackedIds,
  follow,
}: {
  username: string;
  bio: string | null;
  avatarSrc: string | null;
  prefs: ProfilePrefs;
  entries: Entry[];
  stats: Stats;
  isOwner: boolean;
  // The current *viewer's* own tracked anime, not this page's owner's — a
  // signed-in visitor can still quick-add anything they see here to their
  // own list, same as Browse/Seasonal, without it implying anything about
  // whether the owner has it tracked (they obviously do, it's their entry).
  // Unused when isOwner (their own cards are always tracked).
  viewerTrackedIds: Set<number>;
  follow: {
    counts: { followers: number; following: number };
    showButton: boolean;
    viewerIsFollowing: boolean;
  };
}) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const displayBio = bio ?? "";
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
    if (!isOwner) return;
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) router.refresh();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router, isOwner]);

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

  const entryByAnimeId = useMemo(() => new Map(entries.map((e) => [e.anime.id, e])), [entries]);

  const favoriteEntries = prefs.favoriteIds
    .map((id) => entryByAnimeId.get(id))
    .filter((e): e is Entry => e != null);

  const bannerEntry = prefs.headerStyle === "banner" && prefs.bannerAnilistId != null
    ? entryByAnimeId.get(prefs.bannerAnilistId)
    : undefined;
  const bannerImage = bannerEntry?.anime.bannerImage ?? null;

  const query = search.trim().toLowerCase();
  function matchesSearch(entry: Entry) {
    if (!query) return true;
    return entryTitle(entry).toLowerCase().includes(query);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePrefs: prefs }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSaveError(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setSaveError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const headerContent = (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex items-center gap-4">
          <Avatar src={avatarSrc} username={username} size={56} />
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl text-paper">{username}&apos;s list</h1>
            {displayBio && !editing && (
              <p className="max-w-md whitespace-pre-wrap text-sm text-ash">{displayBio}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-shrink-0 sm:flex-nowrap">
          <ShareButton title={`${username}'s list`} />
          {isOwner ? (
            <>
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
            </>
          ) : (
            follow.showButton && <FollowButton username={username} initialFollowing={follow.viewerIsFollowing} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-widest text-ash">
        <Link href={`/u/${username}/followers`} className="transition-colors hover:text-hanko">
          <span className="text-paper">{follow.counts.followers}</span> followers
        </Link>
        <Link href={`/u/${username}/following`} className="transition-colors hover:text-hanko">
          <span className="text-paper">{follow.counts.following}</span> following
        </Link>
      </div>

      {favoriteEntries.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Favorites</span>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {favoriteEntries.map((entry) => (
              <Link
                key={entry.anime.id}
                href={`/anime/${entry.anime.id}`}
                title={entryTitle(entry)}
                className="relative h-24 w-16 flex-shrink-0 overflow-hidden border border-line transition-opacity hover:opacity-80"
              >
                {entry.anime.coverImage.large && (
                  <Image src={entry.anime.coverImage.large} alt="" fill sizes="64px" className="object-cover" />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {isOwner && editing && (
        <ProfileCustomizePanel
          username={username}
          prefs={prefs}
          setPrefs={setPrefs}
          entries={entries}
          saving={saving}
          saveError={saveError}
          onSave={save}
        />
      )}

      <div className="flex flex-wrap gap-3">
        {prefs.stats.total && (
          <div className="border border-line px-4 py-2">
            <p className="font-display text-xl text-paper">{stats.total}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ash">Tracked</p>
          </div>
        )}
        {prefs.stats.episodes && (
          <div className="border border-line px-4 py-2">
            <p className="font-display text-xl text-paper">{stats.episodesWatched}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ash">Episodes</p>
          </div>
        )}
        {prefs.stats.avgScore && stats.avgScore && (
          <div className="border border-line px-4 py-2">
            <p className="font-display text-xl text-hanko">{stats.avgScore}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ash">Avg score</p>
          </div>
        )}

        {prefs.stats.genres && stats.topGenres.length > 0 && (
          <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1.5 border border-line px-4 py-2">
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
    </>
  );

  return (
    <main className="flex w-full flex-col" style={{ ["--color-hanko" as string]: prefs.accentColor }}>
      {bannerImage && (
        <div className="relative h-48 w-full sm:h-64">
          <Image src={bannerImage} alt="" fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
        </div>
      )}

      <div className="flex flex-col gap-12 px-8 py-12 2xl:px-16">
        <header className="flex flex-col gap-6 border-b border-line pb-8">{headerContent}</header>

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
                        key={entry.anime.id}
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
                        key={entry.anime.id}
                        anime={entry.anime}
                        initialTracked={isOwner || viewerTrackedIds.has(entry.anime.id)}
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
          <p className="py-16 text-center text-sm text-ash">
            Nothing in {username}&apos;s list matches &quot;{search}&quot;.
          </p>
        )}
      </div>
    </main>
  );
}

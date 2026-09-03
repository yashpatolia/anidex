"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { searchAnime } from "@/lib/anilist-client";

type AnimeResult = { id: number; title: string; coverImage: string | null; genres: string[] };
type UserResult = { username: string; bio: string | null };

export function NavSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [open, setOpen] = useState(false);
  // Anime is the default, primary search — user results are a click away
  // rather than always fetched alongside it, so a plain anime search isn't
  // paying for (or visually competing with) a query it didn't ask for.
  const [showPeople, setShowPeople] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const q = query.trim();
    // Nothing to clear synchronously: the dropdown only renders results
    // when there's a query (see the JSX below), so a stale `results` value
    // while `q` is empty is simply never shown.
    if (!q) return;

    const id = setTimeout(async () => {
      try {
        // Straight to AniList's own search field from the browser now —
        // no local title index anymore (that was itself a server-side
        // store of AniList data). Real quality tradeoff: AniList's search
        // is fuzzy/similarity-based and returns nothing for short
        // fragments (e.g. "toni" finds nothing, "tonika" does), unlike
        // the old local substring index.
        const { media } = await searchAnime(q, 1, 5);
        setResults(
          media.map((m) => ({
            id: m.id,
            title: m.title.english ?? m.title.romaji ?? m.title.native ?? "Untitled",
            coverImage: m.coverImage.large,
            genres: m.genres.slice(0, 3),
          })),
        );
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  // Only runs once "Search people" has actually been clicked — the same
  // debounced-fetch shape as the anime effect above, just gated on
  // `showPeople` so typing further while it's open keeps that search live.
  useEffect(() => {
    const q = query.trim();
    if (!q || !showPeople) return;

    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/quick/users?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setUsers(data.users ?? []);
      } catch {
        setUsers([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query, showPeople]);

  function goToResults() {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/browse?search=${encodeURIComponent(q)}`);
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-sm">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="8.5" cy="8.5" r="6" />
          <line x1="13.2" y1="13.2" x2="18" y2="18" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) setShowPeople(false);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") goToResults();
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search anime"
          className="w-full border border-line bg-ink py-1.5 pl-9 pr-3 font-body text-sm text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 top-full z-40 mt-2 max-h-[min(70vh,32rem)] w-full min-w-[320px] overflow-y-auto border border-line bg-ink shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          {results.length === 0 ? (
            <p className="p-3 font-mono text-xs text-ash">No matches.</p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      router.push(`/anime/${r.id}`);
                    }}
                    className="flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-line/40"
                  >
                    {r.coverImage && (
                      <span className="relative h-14 w-10 flex-shrink-0 overflow-hidden bg-line">
                        <Image src={r.coverImage} alt="" fill sizes="40px" className="object-cover" />
                      </span>
                    )}
                    <span className="flex flex-col gap-0.5 overflow-hidden">
                      <span className="font-body text-sm leading-tight text-paper line-clamp-1">
                        {r.title}
                      </span>
                      {r.genres.length > 0 && (
                        <span className="font-mono text-[10px] uppercase tracking-wide text-ash line-clamp-1">
                          {r.genres.join(" · ")}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!showPeople ? (
            <button
              type="button"
              onClick={() => setShowPeople(true)}
              className="block w-full border-t border-line px-3 py-2 text-left font-mono text-[11px] uppercase tracking-widest text-ash transition-colors hover:text-hanko"
            >
              Search people for &quot;{query}&quot;
            </button>
          ) : (
            <div className="border-t border-line">
              <p className="border-b border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ash">
                People
              </p>
              {users.length === 0 ? (
                <p className="p-3 font-mono text-xs text-ash">No users found.</p>
              ) : (
                <ul>
                  {users.map((u) => (
                    <li key={u.username}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          setQuery("");
                          router.push(`/u/${u.username}`);
                        }}
                        className="flex w-full flex-col gap-0.5 border-b border-line px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-line/40"
                      >
                        <span className="font-body text-sm leading-tight text-paper">{u.username}</span>
                        {u.bio && <span className="font-mono text-[10px] text-ash line-clamp-1">{u.bio}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={goToResults}
            className="block w-full border-t border-line px-3 py-2 text-left font-mono text-[11px] uppercase tracking-widest text-ash transition-colors hover:text-hanko"
          >
            See all anime results for &quot;{query}&quot;
          </button>
        </div>
      )}
    </div>
  );
}

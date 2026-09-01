"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Result = { id: number; title: string; coverImage: string | null; genres: string[] };

export function NavSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
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
        const res = await fetch(`/api/search/quick?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

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
          onChange={(e) => setQuery(e.target.value)}
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
        <div className="absolute left-0 top-full z-40 mt-2 w-full min-w-[320px] border border-line bg-ink shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
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
          <button
            type="button"
            onClick={goToResults}
            className="block w-full border-t border-line px-3 py-2 text-left font-mono text-[11px] uppercase tracking-widest text-ash transition-colors hover:text-hanko"
          >
            See all results for &quot;{query}&quot;
          </button>
        </div>
      )}
    </div>
  );
}

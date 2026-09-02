"use client";

import { useEffect, useState } from "react";
import { FollowButton } from "@/components/follow-button";
import Link from "next/link";

type Result = { username: string; bio: string | null; isFollowing: boolean };

export function PeopleSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = query.trim();
    // Nothing to clear synchronously: the results list only renders when
    // there's a query (see the JSX below), so a stale `results` value while
    // `q` is empty is simply never shown.
    if (!q) return;

    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearched(true);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <div className="flex flex-col gap-6">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by username"
        className="w-full max-w-sm border-b border-line bg-transparent py-2 font-body text-sm text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
      />

      {query.trim() && searched && results.length === 0 && (
        <p className="text-sm text-ash">No users found matching &quot;{query.trim()}&quot;.</p>
      )}

      {query.trim() && results.length > 0 && (
        <ul className="flex flex-col border-t border-line">
          {results.map((r) => (
            <li key={r.username} className="flex items-center justify-between gap-4 border-b border-line py-3">
              <div className="flex flex-col gap-0.5">
                <Link href={`/u/${r.username}`} className="text-paper transition-colors hover:text-hanko">
                  {r.username}
                </Link>
                {r.bio && <p className="max-w-md text-xs text-ash line-clamp-1">{r.bio}</p>}
              </div>
              <FollowButton username={r.username} initialFollowing={r.isFollowing} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

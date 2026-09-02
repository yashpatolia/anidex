import Link from "next/link";
import { FollowButton } from "@/components/follow-button";
import type { FollowListEntry } from "@/lib/follows";

// Shared body for /u/[username]/followers and /u/[username]/following —
// same row layout either way, just a different title and source list.
export function FollowListPage({
  title,
  backHref,
  rows,
  viewerUsername,
  viewerFollowingUsernames,
}: {
  title: string;
  backHref: string;
  rows: FollowListEntry[];
  // Undefined when signed out — no Follow buttons at all, same rule as the
  // profile page itself.
  viewerUsername: string | undefined;
  viewerFollowingUsernames: Set<string>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-8 py-12">
      <div className="flex flex-col gap-2">
        <Link href={backHref} className="font-mono text-xs uppercase tracking-widest text-ash hover:text-hanko">
          ← Back to list
        </Link>
        <h1 className="font-display text-2xl text-paper">{title}</h1>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ash">Nobody here yet.</p>
      ) : (
        <ul className="flex flex-col border-t border-line">
          {rows.map((row) => (
            <li key={row.username} className="flex items-center justify-between gap-4 border-b border-line py-3">
              {row.isPublic ? (
                <Link href={`/u/${row.username}`} className="text-paper transition-colors hover:text-hanko">
                  {row.username}
                </Link>
              ) : (
                <span className="text-ash">{row.username}</span>
              )}
              {viewerUsername && viewerUsername !== row.username && row.isPublic && (
                <FollowButton
                  username={row.username}
                  initialFollowing={viewerFollowingUsernames.has(row.username)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

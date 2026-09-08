"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { WatchStatus } from "@/lib/anilist-shared";

// The statuses this quick menu can actually set — mirrors the quick-add
// API route's own enum. Deliberately narrower than the full WatchStatus
// union: REWATCHING is only ever set from the anime detail page's full
// editor (AddToListControl), never from this one-click menu. A card can
// still be showing a REWATCHING entry though (badge display below handles
// the full WatchStatus union), just not one this menu's options can set.
type Status = "WATCHING" | "COMPLETED" | "PLANNED" | "PAUSED" | "DROPPED";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "WATCHING", label: "Watching" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PLANNED", label: "Plan to watch" },
  { value: "PAUSED", label: "On hold" },
  { value: "DROPPED", label: "Dropped" },
];

const STATUS_BADGE_LABELS: Record<WatchStatus, string> = {
  WATCHING: "Watching",
  COMPLETED: "Completed",
  PLANNED: "Planned",
  PAUSED: "On hold",
  DROPPED: "Dropped",
  REWATCHING: "Rewatching",
};

export function QuickAddButton({
  anilistId,
  initialTracked = false,
  initialStatus = null,
  onStatusChange,
}: {
  anilistId: number;
  initialTracked?: boolean;
  // The real status to show as a badge instead of a bare checkmark. Left
  // unset by callers (e.g. airing calendar's tiny thumbnails, or Profile
  // viewing someone else's list) that only know plain tracked/untracked —
  // those keep the old checkmark look via initialTracked.
  initialStatus?: WatchStatus | null;
  // Notified after a status change actually saves (add, change, or
  // remove) so a parent that filters by tracked status can react — e.g.
  // Recommendations dropping a card the moment it gets tracked.
  onStatusChange?: (status: WatchStatus | null) => void;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [tracked, setTracked] = useState(initialStatus != null ? true : initialTracked);
  const [entryStatus, setEntryStatus] = useState<WatchStatus | null>(initialStatus);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (sessionStatus === "loading") return null;

  function handleToggleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session?.user) {
      router.push("/login");
      return;
    }
    setOpen((o) => !o);
  }

  async function chooseStatus(status: Status) {
    const wasTracked = tracked;
    const previousStatus = entryStatus;
    setBusy(true);
    setOpen(false);
    try {
      const res = await fetch("/api/list/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anilistId, status }),
      });
      if (!res.ok) {
        // AniList is the only copy of this now — a failed sync means
        // nothing actually saved, so don't leave the button showing tracked.
        setTracked(wasTracked);
        setEntryStatus(previousStatus);
        return;
      }
      setTracked(true);
      setEntryStatus(status);
      onStatusChange?.(status);
      // Invalidates Next's client-side Router Cache so Profile shows this
      // change immediately on the next navigation there, not a stale copy.
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const previousStatus = entryStatus;
    setOpen(false);
    setBusy(true);
    setTracked(false); // optimistic
    setEntryStatus(null);
    try {
      const res = await fetch(`/api/list/${anilistId}`, { method: "DELETE" });
      if (!res.ok) {
        setTracked(true);
        setEntryStatus(previousStatus);
        return;
      }
      onStatusChange?.(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={rootRef} className="absolute left-2 top-2 z-10">
      <button
        type="button"
        onClick={handleToggleClick}
        aria-label={tracked ? "Change list status" : "Add to list"}
        title={tracked ? "In your list, click to change" : "Add to your list"}
        disabled={busy}
        className={`flex h-7 items-center justify-center border-2 font-mono transition-all duration-200 ${
          tracked
            ? "w-auto gap-1 whitespace-nowrap border-hanko bg-hanko px-2 text-[10px] uppercase tracking-wide text-paper opacity-100"
            : "w-7 border-paper/70 bg-ink/70 text-sm text-paper opacity-0 hover:border-hanko hover:text-hanko group-hover:opacity-100"
        } ${open ? "opacity-100" : ""}`}
      >
        {tracked ? (entryStatus ? STATUS_BADGE_LABELS[entryStatus] : "✓") : "+"}
      </button>

      {open && (
        <ul
          onClick={(e) => e.preventDefault()}
          className="absolute left-0 top-full mt-1 w-36 border border-line bg-ink shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  chooseStatus(opt.value);
                }}
                className={`block w-full border-b border-line px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wide transition-colors hover:bg-line/40 hover:text-hanko ${
                  entryStatus === opt.value ? "text-hanko" : "text-paper"
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
          {tracked && (
            <li>
              <button
                type="button"
                onClick={remove}
                className="block w-full px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wide text-ash transition-colors hover:bg-line/40 hover:text-hanko"
              >
                Remove
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Mirrors the Prisma WatchStatus enum values as plain strings. Deliberately
// not importing the generated Prisma client here: it's a server-only module
// (uses Node built-ins internally), and importing it from a "use client"
// component pulls that into the browser bundle and breaks the build.
type WatchStatus = "WATCHING" | "COMPLETED" | "PLANNED" | "DROPPED" | "PAUSED" | "REWATCHING";

const STATUS_OPTIONS: { value: WatchStatus; label: string }[] = [
  { value: "WATCHING", label: "Watching" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PLANNED", label: "Plan to watch" },
  { value: "PAUSED", label: "On hold" },
  { value: "DROPPED", label: "Dropped" },
];

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);

type Entry = { status: WatchStatus; score: number | null; progress: number };

// The full status/score/progress editor used to sit permanently expanded
// on the page — a tall box of buttons even when all you wanted to check
// was whether it was tracked at all. Now it's a single pill (status +
// score) that opens the same editor as a dropdown, closing on an outside
// click like the rest of this app's dropdowns (see e.g. sort-select.tsx).
export function AddToListControl({
  anilistId,
  episodes,
  initialEntry,
}: {
  anilistId: number;
  episodes: number | null;
  initialEntry: Entry | null;
}) {
  const [entry, setEntry] = useState<Entry | null>(initialEntry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [progressInput, setProgressInput] = useState(String(initialEntry?.progress ?? 0));
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

  // Next's client-side Router Cache would otherwise keep showing whatever
  // Profile/detail data was already fetched this session — router.refresh()
  // invalidates it so navigating back after an edit shows the real values,
  // not a stale snapshot from before the edit.
  async function save(next: Entry) {
    const previous = entry;
    setEntry(next);
    setProgressInput(String(next.progress));
    setError(false);
    setSaving(true);
    try {
      const res = await fetch("/api/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anilistId, ...next }),
      });
      if (!res.ok) {
        // AniList is the only copy of this now — a failed sync here means
        // nothing was actually saved anywhere, so revert the optimistic
        // update rather than leave the UI showing a value AniList never got.
        setEntry(previous);
        setProgressInput(String(previous?.progress ?? 0));
        setError(true);
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const previous = entry;
    setEntry(null);
    setOpen(false);
    setError(false);
    const res = await fetch(`/api/list/${anilistId}`, { method: "DELETE" });
    if (!res.ok) {
      setEntry(previous);
      setError(true);
      return;
    }
    router.refresh();
  }

  // Completed almost always means "I watched all of it", and Plan to watch
  // means "I haven't started" — jump progress to match rather than leaving
  // it wherever it happened to be, so neither needs a separate manual fix
  // every time.
  function chooseStatus(status: WatchStatus) {
    if (!entry) return;
    let progress = entry.progress;
    if (status === "COMPLETED" && episodes) progress = episodes;
    else if (status === "PLANNED") progress = 0;
    save({ ...entry, status, progress });
  }

  function commitProgress() {
    if (!entry) return;
    const parsed = Number.parseInt(progressInput, 10);
    const clamped = Number.isFinite(parsed)
      ? Math.max(0, episodes != null ? Math.min(episodes, parsed) : parsed)
      : entry.progress;
    if (clamped === entry.progress) {
      setProgressInput(String(clamped)); // revert an invalid/unchanged typed value
      return;
    }
    save({ ...entry, progress: clamped });
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <button
          type="button"
          onClick={() => save({ status: "PLANNED", score: null, progress: 0 })}
          className="border border-hanko bg-hanko px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
        >
          + Add to list
        </button>
        {error && <span className="font-mono text-[11px] text-hanko">Couldn&apos;t save to AniList. Try again.</span>}
      </div>
    );
  }

  const statusLabel = STATUS_OPTIONS.find((o) => o.value === entry.status)?.label ?? entry.status;

  return (
    <div ref={rootRef} className={`relative self-start transition-opacity ${saving ? "opacity-70" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border border-hanko bg-hanko px-4 py-2 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-90"
      >
        {statusLabel}
        {entry.score != null && <span>· {entry.score}/10</span>}
        <span className="text-[10px]">{open ? "▴" : "▾"}</span>
      </button>
      {error && (
        <p className="mt-1 font-mono text-[11px] text-hanko">Couldn&apos;t save to AniList. Try again.</p>
      )}

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 flex w-72 flex-col gap-4 border border-line bg-ink p-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Status</span>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => chooseStatus(opt.value)}
                  className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                    entry.status === opt.value
                      ? "border-hanko bg-hanko text-paper"
                      : "border-line text-ash hover:border-ash hover:text-paper"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Your score</span>
            <div className="flex flex-wrap gap-1.5">
              {SCORES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => save({ ...entry, score: entry.score === s ? null : s })}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[11px] transition-colors ${
                    entry.score === s
                      ? "border-hanko bg-hanko text-paper"
                      : "border-line text-ash hover:border-hanko hover:text-hanko"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Progress</span>
            <button
              type="button"
              onClick={() => save({ ...entry, progress: Math.max(0, entry.progress - 1) })}
              disabled={entry.progress <= 0}
              className="flex h-7 w-7 items-center justify-center border border-line text-paper transition-colors hover:border-hanko hover:text-hanko disabled:opacity-30"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={episodes ?? undefined}
              value={progressInput}
              onChange={(e) => setProgressInput(e.target.value)}
              onBlur={commitProgress}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              aria-label="Episodes watched"
              className="w-12 border border-line bg-transparent px-1.5 py-1 text-center font-mono text-xs text-paper focus:border-hanko focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="font-mono text-xs text-paper">/ {episodes ?? "?"}</span>
            <button
              type="button"
              onClick={() =>
                save({ ...entry, progress: episodes ? Math.min(episodes, entry.progress + 1) : entry.progress + 1 })
              }
              disabled={episodes != null && entry.progress >= episodes}
              className="flex h-7 w-7 items-center justify-center border border-line text-paper transition-colors hover:border-hanko hover:text-hanko disabled:opacity-30"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={remove}
            className="self-start font-mono text-[11px] uppercase tracking-widest text-ash transition-colors hover:text-hanko"
          >
            Remove from list
          </button>
        </div>
      )}
    </div>
  );
}

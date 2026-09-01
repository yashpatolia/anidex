"use client";

import { useState } from "react";
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
  const [progressInput, setProgressInput] = useState(String(initialEntry?.progress ?? 0));
  const router = useRouter();

  // Next's client-side Router Cache would otherwise keep showing whatever
  // Profile/detail data was already fetched this session — router.refresh()
  // invalidates it so navigating back after an edit shows the real values,
  // not a stale snapshot from before the edit.
  async function save(next: Entry) {
    setEntry(next);
    setProgressInput(String(next.progress));
    setSaving(true);
    try {
      await fetch("/api/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anilistId, ...next }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setEntry(null);
    await fetch(`/api/list/${anilistId}`, { method: "DELETE" });
    router.refresh();
  }

  // Marking something Completed almost always means "I watched all of it" —
  // jump progress to the full episode count rather than leaving it wherever
  // it happened to be, so the two rarely-desired states of "Completed" with
  // partial progress don't need a separate manual bump every time.
  function chooseStatus(status: WatchStatus) {
    if (!entry) return;
    const progress = status === "COMPLETED" && episodes ? episodes : entry.progress;
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
      <button
        type="button"
        onClick={() => save({ status: "PLANNED", score: null, progress: 0 })}
        className="border border-hanko bg-hanko px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
      >
        + Add to list
      </button>
    );
  }

  return (
    <div className={`flex flex-col gap-4 border border-line p-4 transition-opacity ${saving ? "opacity-70" : ""}`}>
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
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Status = "WATCHING" | "COMPLETED" | "PLANNED" | "PAUSED" | "DROPPED";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "WATCHING", label: "Watching" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PLANNED", label: "Plan to watch" },
  { value: "PAUSED", label: "On hold" },
  { value: "DROPPED", label: "Dropped" },
];

export function QuickAddButton({
  anilistId,
  initialTracked = false,
}: {
  anilistId: number;
  initialTracked?: boolean;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [tracked, setTracked] = useState(initialTracked);
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
    setBusy(true);
    setOpen(false);
    try {
      await fetch("/api/list/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anilistId, status }),
      });
      setTracked(true);
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
    setOpen(false);
    setBusy(true);
    setTracked(false); // optimistic
    try {
      await fetch(`/api/list/${anilistId}`, { method: "DELETE" });
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
        title={tracked ? "In your list — click to change" : "Add to your list"}
        disabled={busy}
        className={`flex h-7 w-7 items-center justify-center border-2 font-mono text-sm transition-all duration-200 ${
          tracked
            ? "border-hanko bg-hanko text-paper opacity-100"
            : "border-paper/70 bg-ink/70 text-paper opacity-0 hover:border-hanko hover:text-hanko group-hover:opacity-100"
        } ${open ? "opacity-100" : ""}`}
      >
        {tracked ? "✓" : "+"}
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
                className="block w-full border-b border-line px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wide text-paper transition-colors hover:bg-line/40 hover:text-hanko"
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

"use client";

import { useEffect, useRef, useState } from "react";

const CURRENT_YEAR = new Date().getFullYear();

export function FilterYearRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const label = from && to ? `${from}–${to}` : from ? `${from}+` : to ? `Up to ${to}` : "All";

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Year</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 border border-line bg-ink px-3 py-2 font-mono text-xs uppercase tracking-wide text-paper transition-colors hover:border-ash focus:border-hanko focus:outline-none"
      >
        {label}
        <span className="text-[10px] text-ash">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 flex w-56 flex-col gap-3 border border-line bg-ink p-3 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ash">From</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Any"
              min={1960}
              max={CURRENT_YEAR}
              value={from}
              onChange={(e) => onChange(e.target.value, to)}
              className="border border-line bg-ink px-2 py-1.5 font-mono text-xs text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ash">To</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Any"
              min={1960}
              max={CURRENT_YEAR}
              value={to}
              onChange={(e) => onChange(from, e.target.value)}
              className="border border-line bg-ink px-2 py-1.5 font-mono text-xs text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
            />
          </label>
          {(from || to) && (
            <button
              type="button"
              onClick={() => onChange("", "")}
              className="text-left font-mono text-[11px] uppercase tracking-widest text-ash transition-colors hover:text-hanko"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

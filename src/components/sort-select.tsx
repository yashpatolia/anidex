"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type SortOption<T extends string> = { value: T; label: string; icon: ReactNode };

// Dropdown for Profile's sort control. A row of icon buttons doesn't scale
// as more sort options get added later, so this trades a little space for
// room to grow — each option still keeps its icon, just with a label next
// to it now that there's room.
export function SortSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SortOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Sort: ${current.label}`}
        className="flex h-8 items-center gap-2 border border-line px-2.5 font-mono text-xs uppercase tracking-wide text-paper transition-colors hover:border-ash"
      >
        <span className="h-4 w-4 flex-shrink-0">{current.icon}</span>
        {current.label}
        <span className="text-[10px] text-ash">▾</span>
      </button>

      {open && (
        <ul className="absolute right-0 top-full z-40 mt-1 w-48 border border-line bg-ink shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 border-b border-line px-3 py-2 text-left font-mono text-xs uppercase tracking-wide transition-colors last:border-b-0 hover:bg-line/40 ${
                  opt.value === value ? "text-hanko" : "text-paper"
                }`}
              >
                <span className="h-4 w-4 flex-shrink-0">{opt.icon}</span>
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

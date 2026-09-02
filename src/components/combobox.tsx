"use client";

import { useEffect, useRef, useState } from "react";

export type ComboboxOption = { value: string; label: string };

// A typeable, custom-styled stand-in for a native <select> — used wherever
// the list of options is long enough that scrolling a plain dropdown isn't
// good enough (e.g. picking one anime out of a whole tracked list).
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Search…",
  allowClear,
  clearLabel = "None",
}: {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value) ?? null;
  // While closed, the input just displays the current selection; while
  // open, it's a live filter — reset to blank on focus so typing doesn't
  // require clearing the existing label first.
  const displayValue = open ? query : (selected?.label ?? "");

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  function select(next: string | null) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        placeholder={placeholder}
        className="w-full border border-line bg-ink px-3 py-1.5 font-body text-sm text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
      />

      {open && (
        <ul className="absolute left-0 top-full z-30 mt-1 max-h-56 w-full overflow-y-auto border border-line bg-ink shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          {allowClear && (
            <li>
              <button
                type="button"
                onClick={() => select(null)}
                className="block w-full border-b border-line px-3 py-2 text-left font-mono text-xs uppercase tracking-wide text-ash transition-colors hover:bg-line/40"
              >
                {clearLabel}
              </button>
            </li>
          )}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 font-mono text-xs text-ash">No matches.</li>
          ) : (
            filtered.slice(0, 50).map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => select(opt.value)}
                  className={`block w-full truncate border-b border-line px-3 py-2 text-left font-body text-sm transition-colors last:border-b-0 hover:bg-line/40 ${
                    opt.value === value ? "text-hanko" : "text-paper"
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

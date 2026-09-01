"use client";

import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

export function FilterSelect({
  label,
  options,
  value,
  onChange,
  allowAll = true,
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
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

  const current = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-ash">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 border border-line bg-ink px-3 py-2 font-mono text-xs uppercase tracking-wide text-paper transition-colors hover:border-ash focus:border-hanko focus:outline-none"
      >
        {current?.label ?? (allowAll ? "All" : options[0]?.label)}
        <span className="text-[10px] text-ash">▾</span>
      </button>

      {open && (
        <ul className="absolute left-0 top-full z-40 mt-1 max-h-72 w-40 overflow-y-auto border border-line bg-ink shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          {allowAll && (
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className={`block w-full border-b border-line px-3 py-2 text-left font-mono text-xs uppercase tracking-wide transition-colors hover:bg-line/40 ${
                  value === "" ? "text-hanko" : "text-paper"
                }`}
              >
                All
              </button>
            </li>
          )}
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`block w-full border-b border-line px-3 py-2 text-left font-mono text-xs uppercase tracking-wide transition-colors last:border-b-0 hover:bg-line/40 ${
                  value === opt.value ? "text-hanko" : "text-paper"
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

export function FilterMultiSelect({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
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

  function toggle(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  }

  const buttonLabel =
    values.length === 0 ? "All" : values.length === 1 ? options.find((o) => o.value === values[0])?.label : `${values.length} selected`;

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-ash">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 border border-line bg-ink px-3 py-2 font-mono text-xs uppercase tracking-wide text-paper transition-colors hover:border-ash focus:border-hanko focus:outline-none"
      >
        {buttonLabel}
        <span className="text-[10px] text-ash">▾</span>
      </button>

      {open && (
        <ul className="absolute left-0 top-full z-40 mt-1 max-h-72 w-44 overflow-y-auto border border-line bg-ink shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          <li>
            <button
              type="button"
              onClick={() => onChange([])}
              className={`flex w-full items-center justify-between border-b border-line px-3 py-2 text-left font-mono text-xs uppercase tracking-wide transition-colors hover:bg-line/40 ${
                values.length === 0 ? "text-hanko" : "text-paper"
              }`}
            >
              All
              {values.length === 0 && <span>✓</span>}
            </button>
          </li>
          {options.map((opt) => {
            const selected = values.includes(opt.value);
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={`flex w-full items-center justify-between border-b border-line px-3 py-2 text-left font-mono text-xs uppercase tracking-wide transition-colors last:border-b-0 hover:bg-line/40 ${
                    selected ? "text-hanko" : "text-paper"
                  }`}
                >
                  {opt.label}
                  {selected && <span>✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

// Small dropdown offering the two /api/export formats as plain download
// links — no fetch/blob dance needed, the browser's normal same-origin GET
// navigation carries the session cookie and the route's Content-Disposition
// header does the rest.
export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:border-hanko hover:text-hanko"
      >
        Export
      </button>

      {open && (
        <ul className="absolute right-0 top-full z-40 mt-1 w-40 border border-line bg-ink shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          {(["json", "csv"] as const).map((format) => (
            <li key={format}>
              <a
                href={`/api/export?format=${format}`}
                onClick={() => setOpen(false)}
                className="block border-b border-line px-3 py-2 font-mono text-xs uppercase tracking-wide text-paper transition-colors last:border-b-0 hover:bg-line/40 hover:text-hanko"
              >
                As {format.toUpperCase()}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

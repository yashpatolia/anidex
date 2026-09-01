"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

// The nav's actual content (links, search, sign-in/out) is server-rendered
// and passed in as children — this component only owns the open/closed
// state and the hamburger button, so nav.tsx doesn't need to duplicate
// session-dependent JSX across a server/client boundary.
export function MobileMenuToggle({ children }: { children: ReactNode }) {
  // Keying the panel by pathname forces a remount (resetting `open` back to
  // its initial false) on every navigation, so tapping a link inside it
  // doesn't leave the panel open underneath the newly-loaded page. This is
  // the React-recommended way to reset state on a change like this — no
  // effect, no ref read/write during render, both of which this project's
  // stricter react-hooks rules (set-state-in-effect, refs) disallow.
  const pathname = usePathname();
  return <MobileMenuPanel key={pathname}>{children}</MobileMenuPanel>;
}

function MobileMenuPanel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center text-paper"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
          {open ? (
            <>
              <line x1="4.5" y1="4.5" x2="15.5" y2="15.5" strokeLinecap="round" />
              <line x1="15.5" y1="4.5" x2="4.5" y2="15.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <line x1="3" y1="5.5" x2="17" y2="5.5" strokeLinecap="round" />
              <line x1="3" y1="10" x2="17" y2="10" strokeLinecap="round" />
              <line x1="3" y1="14.5" x2="17" y2="14.5" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-14 z-30 border-b border-line bg-ink px-8 py-4">
          {children}
        </div>
      )}
    </div>
  );
}

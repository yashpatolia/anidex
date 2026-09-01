"use client";

import { useRef, type ReactNode } from "react";

// Horizontal scroll container with hover-revealed arrow buttons. Native
// drag/trackpad/touch scrolling always works, but without a visible
// affordance (no scrollbar — hidden on purpose to match the rest of the
// site) there's nothing telling a mouse user it's scrollable at all.
export function ScrollRail({ children }: { children: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  }

  return (
    <div className="group/rail relative">
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollBy(-1)}
        className="absolute left-0 top-0 hidden h-[calc(100%-0.5rem)] w-10 items-center justify-center bg-gradient-to-r from-ink to-transparent font-mono text-base text-paper opacity-0 transition-opacity duration-200 hover:text-hanko group-hover/rail:opacity-100 lg:flex"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        className="absolute right-0 top-0 hidden h-[calc(100%-0.5rem)] w-10 items-center justify-center bg-gradient-to-l from-ink to-transparent font-mono text-base text-paper opacity-0 transition-opacity duration-200 hover:text-hanko group-hover/rail:opacity-100 lg:flex"
      >
        ›
      </button>
    </div>
  );
}

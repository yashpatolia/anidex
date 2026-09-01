"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type GalleryItem = { id: number; src: string; title: string };

const INTERVAL_MS = 7000;
const CARD_WIDTH = 150;
const CARD_HEIGHT = (CARD_WIDTH * 3) / 2; // matches each slot's aspect-[2/3]
const GAP = 16;
const STEP = CARD_WIDTH + GAP;
const VISIBLE_RADIUS = 2; // how many slots to render each side of the active one

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path
        d={direction === "left" ? "M12.5 4.5 6.5 10l6 5.5" : "M7.5 4.5 13.5 10l-6 5.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function wrap(n: number, len: number): number {
  return ((n % len) + len) % len;
}

// A turntable-style carousel: the active cover sits centered and enlarged,
// with its neighbors peeking in smaller and dimmer on either side.
//
// `index` is intentionally never wrapped back into [0, items.length) — it's
// just a running count of how many steps forward (or back) the carousel has
// taken. Each rendered slot sits at an absolute track position equal to its
// own unwrapped position, and only the *item shown* at that position wraps
// (via `wrap()`) to cycle through the real array. That split is what lets
// the track keep sliding in one consistent direction forever: looping past
// the last item never means snapping the transform back to slot 0, since
// there effectively is no "slot 0" to snap back to.
export function HeroGallery({ items }: { items: GalleryItem[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => setIndex((i) => i + 1), INTERVAL_MS);
    return () => clearInterval(id);
  }, [items.length, index]);

  if (items.length === 0) return null;
  const len = items.length;
  const activeRealIndex = wrap(index, len);
  const active = items[activeRealIndex];

  // Jump to a specific real item (dots) via the shortest rotational path
  // from the current position, rather than always spinning forward.
  function goToRealIndex(target: number) {
    let diff = wrap(target - activeRealIndex, len);
    if (diff > len / 2) diff -= len;
    setIndex((i) => i + diff);
  }

  // Track div is positioned with its own left edge at the container's
  // horizontal center (left: 50%, below); this translate then pulls it
  // left by however far the active slot's own center sits from position 0,
  // landing that slot's center back on the container's center regardless
  // of containerWidth (which cancels out of this specific offset).
  const trackTranslateX = -index * STEP - CARD_WIDTH / 2;

  const slots = [];
  for (let p = index - VISIBLE_RADIUS; p <= index + VISIBLE_RADIUS; p++) {
    slots.push({ position: p, item: items[wrap(p, len)] });
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-[320px] w-full overflow-hidden lg:h-[360px]">
        <div
          className="absolute top-1/2 left-1/2 transition-transform duration-700 ease-out"
          style={{ height: CARD_HEIGHT, transform: `translate(${trackTranslateX}px, ${-CARD_HEIGHT / 2}px)` }}
        >
          {slots.map(({ position, item }) => {
            const distance = position - index;
            const isActive = distance === 0;
            return (
              <button
                key={position}
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`Show ${item.title}`}
                aria-current={isActive}
                className="absolute top-0 transition-[transform,opacity] duration-700 ease-out"
                style={{
                  left: position * STEP,
                  width: CARD_WIDTH,
                  transform: `scale(${isActive ? 1.55 : 1})`,
                  opacity: Math.abs(distance) > 1 ? 0 : isActive ? 1 : 0.45,
                  zIndex: isActive ? 20 : 10,
                  pointerEvents: Math.abs(distance) > 1 ? "none" : "auto",
                }}
              >
                <span className="relative block aspect-[2/3] w-full shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
                  <Image
                    src={item.src}
                    alt={item.title}
                    fill
                    priority={position === index}
                    sizes="200px"
                    className="object-cover"
                  />
                </span>
              </button>
            );
          })}
        </div>

        {len > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => i - 1)}
              aria-label="Previous"
              className="absolute left-0 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center border border-line bg-ink/80 text-paper transition-colors hover:border-hanko hover:text-hanko"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => i + 1)}
              aria-label="Next"
              className="absolute right-0 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center border border-line bg-ink/80 text-paper transition-colors hover:border-hanko hover:text-hanko"
            >
              <ChevronIcon direction="right" />
            </button>
          </>
        )}
      </div>

      <Link
        href={`/anime/${active.id}`}
        className="flex flex-col items-center gap-2 text-center focus:outline-none"
      >
        <p className="font-mono text-[10px] uppercase tracking-widest text-ash">Trending now</p>
        <p className="font-display text-base text-paper hover:text-hanko">{active.title}</p>
      </Link>

      {len > 1 && (
        <div className="flex items-center gap-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goToRealIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === activeRealIndex}
              className={`h-1.5 w-1.5 transition-colors ${
                i === activeRealIndex ? "bg-hanko" : "bg-line hover:bg-ash"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

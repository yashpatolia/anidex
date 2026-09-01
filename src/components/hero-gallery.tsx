"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type GalleryItem = { id: number; src: string; title: string };

const INTERVAL_MS = 7000;
const CARD_WIDTH = 150;
const GAP = 16;

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

// A turntable-style carousel: the active cover sits centered and full size,
// with its neighbors peeking in smaller and dimmer on either side. Manual
// arrows + dots sit alongside the existing auto-advance, and any manual
// interaction restarts the auto-advance timer rather than fighting it.
export function HeroGallery({ items }: { items: GalleryItem[] }) {
  const [index, setIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(340);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [items.length, index]);

  if (items.length === 0) return null;
  const active = items[index];

  function go(next: number) {
    setIndex(((next % items.length) + items.length) % items.length);
  }

  const trackOffset = containerWidth / 2 - CARD_WIDTH / 2 - index * (CARD_WIDTH + GAP);

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        ref={(el) => {
          if (el) setContainerWidth(el.clientWidth);
        }}
        className="relative h-[320px] w-full overflow-hidden lg:h-[360px]"
      >
        <div
          className="absolute top-1/2 flex items-center transition-transform duration-700 ease-out"
          style={{ gap: GAP, transform: `translate(${trackOffset}px, -50%)` }}
        >
          {items.map((item, i) => {
            const distance = i - index;
            const isActive = distance === 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show ${item.title}`}
                aria-current={isActive}
                className="flex-shrink-0 transition-[transform,opacity] duration-700 ease-out"
                style={{
                  width: CARD_WIDTH,
                  transform: `scale(${isActive ? 1.55 : 1})`,
                  opacity: Math.abs(distance) > 1 ? 0 : isActive ? 1 : 0.45,
                  zIndex: isActive ? 20 : 10,
                }}
              >
                <span className="relative block aspect-[2/3] w-full shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
                  <Image
                    src={item.src}
                    alt={item.title}
                    fill
                    priority={i === 0}
                    sizes="200px"
                    className="object-cover"
                  />
                </span>
              </button>
            );
          })}
        </div>

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous"
              className="absolute left-0 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center border border-line bg-ink/80 text-paper transition-colors hover:border-hanko hover:text-hanko"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
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

      {items.length > 1 && (
        <div className="flex items-center gap-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className={`h-1.5 w-1.5 transition-colors ${i === index ? "bg-hanko" : "bg-line hover:bg-ash"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

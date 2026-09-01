"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type GalleryItem = { id: number; src: string; title: string };

const INTERVAL_MS = 7000;

export function HeroGallery({ items }: { items: GalleryItem[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;
  const active = items[index];

  return (
    <div className="flex flex-col gap-3">
      <Link
        href={`/anime/${active.id}`}
        className="group relative block aspect-[2/3] w-[280px] shadow-[0_20px_60px_rgba(0,0,0,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-hanko lg:w-[320px]"
      >
        {items.map((item, i) => (
          <Image
            key={item.id}
            src={item.src}
            alt={item.title}
            fill
            priority={i === 0}
            sizes="320px"
            className="object-cover transition-opacity duration-1000 ease-in-out group-hover:opacity-90"
            style={{ opacity: i === index ? 1 : 0 }}
          />
        ))}
        <span className="pointer-events-none absolute inset-0 bg-ink opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
      </Link>

      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ash">
          Trending now: {active.title}
        </p>
        <p className="flex-shrink-0 font-mono text-[11px] text-ash">
          {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </p>
      </div>
    </div>
  );
}

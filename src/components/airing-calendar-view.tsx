"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

export type AiringItem = {
  anilistId: number;
  title: string;
  coverImage: string | null;
  episode: number;
  // Unix seconds — grouped into calendar days and formatted using the
  // viewer's own local timezone (client-side, not the server's), since an
  // episode airing near midnight can land on a different day depending on
  // where the viewer actually is.
  airingAt: number;
};

const WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(dayStart: number, todayStart: number): string {
  const diffDays = Math.round((dayStart - todayStart) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return WEEKDAY_FORMAT.format(new Date(dayStart));
}

export function AiringCalendarView({ items }: { items: AiringItem[] }) {
  const days = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const groups = new Map<number, AiringItem[]>();
    for (const item of items) {
      const dayStart = startOfDay(new Date(item.airingAt * 1000));
      if (!groups.has(dayStart)) groups.set(dayStart, []);
      groups.get(dayStart)!.push(item);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dayStart, dayItems]) => ({
        dayStart,
        label: dayLabel(dayStart, todayStart),
        items: dayItems.sort((a, b) => a.airingAt - b.airingAt),
      }));
  }, [items]);

  if (days.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-ash">
        Nothing airing in the next week for what you&apos;re watching.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {days.map((day) => (
        <section key={day.dayStart} className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-paper">{day.label}</h2>
          <div className="flex flex-col border-t border-line">
            {day.items.map((item) => (
              <Link
                key={item.anilistId}
                href={`/anime/${item.anilistId}`}
                className="group flex items-center gap-4 border-b border-line py-3 transition-colors hover:bg-line/20"
              >
                <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden bg-line">
                  {item.coverImage && (
                    <Image src={item.coverImage} alt="" fill sizes="44px" className="object-cover" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                  <p className="font-body text-sm text-paper line-clamp-1 group-hover:text-hanko">{item.title}</p>
                  <p className="font-mono text-xs uppercase tracking-widest text-ash">Episode {item.episode}</p>
                </div>
                <span className="flex-shrink-0 font-mono text-xs text-ash">
                  {TIME_FORMAT.format(new Date(item.airingAt * 1000))}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

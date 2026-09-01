"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { QuickAddButton } from "@/components/quick-add-button";
import type { AnilistMedia } from "@/lib/anilist";

export type AiringItem = {
  anime: AnilistMedia;
  episode: number;
  // Unix seconds — bucketed by local weekday and formatted using the
  // viewer's own timezone (client-side, not the server's), since an
  // episode airing near midnight can land on a different day depending on
  // where the viewer actually is.
  airingAt: number;
  isAdult: boolean;
  initialTracked: boolean;
};

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

// Monday-first column order. Every item falls in a window of "now" through
// "now + 7 days", so every weekday appears exactly once in that span —
// grouping by weekday name alone (not a specific calendar date) is enough,
// no date-matching needed.
const WEEKDAYS = [
  { dayIndex: 1, label: "Monday" },
  { dayIndex: 2, label: "Tuesday" },
  { dayIndex: 3, label: "Wednesday" },
  { dayIndex: 4, label: "Thursday" },
  { dayIndex: 5, label: "Friday" },
  { dayIndex: 6, label: "Saturday" },
  { dayIndex: 0, label: "Sunday" },
];

export function AiringCalendarView({ items }: { items: AiringItem[] }) {
  const columns = useMemo(() => {
    const todayIndex = new Date().getDay();
    const groups = new Map<number, AiringItem[]>();
    for (const item of items) {
      const dayIndex = new Date(item.airingAt * 1000).getDay();
      if (!groups.has(dayIndex)) groups.set(dayIndex, []);
      groups.get(dayIndex)!.push(item);
    }
    return WEEKDAYS.map(({ dayIndex, label }) => ({
      dayIndex,
      label,
      isToday: dayIndex === todayIndex,
      items: (groups.get(dayIndex) ?? []).sort((a, b) => a.airingAt - b.airingAt),
    }));
  }, [items]);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[1120px] grid-cols-7 gap-4">
        {columns.map((day) => (
          <div key={day.dayIndex} className="flex flex-col gap-4">
            <div
              className={`flex flex-col gap-1 border-b pb-3 ${day.isToday ? "border-hanko" : "border-line"}`}
            >
              <h2 className={`font-display text-base ${day.isToday ? "text-hanko" : "text-paper"}`}>
                {day.label}
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ash">
                {day.isToday ? "Today" : `${day.items.length} airing`}
              </span>
            </div>

            <div className="flex flex-col">
              {day.items.length === 0 ? (
                <p className="py-3 text-xs text-ash">Nothing airing.</p>
              ) : (
                day.items.map((item) => {
                  const title = item.anime.title.english ?? item.anime.title.romaji ?? item.anime.title.native ?? "Untitled";
                  return (
                    <Link
                      key={item.anime.id}
                      href={`/anime/${item.anime.id}`}
                      className="group flex items-center gap-2.5 border-b border-line py-2.5 last:border-b-0 hover:bg-line/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-hanko"
                    >
                      <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden bg-line">
                        {item.anime.coverImage.large && (
                          <Image src={item.anime.coverImage.large} alt="" fill sizes="40px" className="object-cover" />
                        )}
                        <QuickAddButton anilistId={item.anime.id} initialTracked={item.initialTracked} />
                        {item.isAdult && (
                          <span className="absolute bottom-0.5 right-0.5 bg-ink/90 px-1 font-mono text-[8px] font-semibold text-ash">
                            18+
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="truncate font-body text-[13px] leading-snug text-paper group-hover:text-hanko">
                          {title}
                        </p>
                        <p className="font-mono text-[10px] text-ash">
                          Ep {item.episode} · {TIME_FORMAT.format(new Date(item.airingAt * 1000))}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

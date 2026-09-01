"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { QuickAddButton } from "@/components/quick-add-button";
import type { AnilistMedia } from "@/lib/anilist";

// Fixed window size per day column. Without this, a busy day (30+ shows)
// makes its column run far past every quieter day's, breaking the grid's
// alignment. Large enough that most columns fill out the page on their own
// (this isn't meant to feel like a cramped preview) — paging only kicks in
// once a day's actually got more than this many shows airing.
const PAGE_SIZE = 18;

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

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

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
  const [pageByDay, setPageByDay] = useState<Record<number, number>>({});

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
      items: (groups.get(dayIndex) ?? []).sort(
        (a, b) => a.airingAt - b.airingAt,
      ),
    }));
  }, [items]);

  function changePage(dayIndex: number, delta: number, maxPage: number) {
    setPageByDay((prev) => {
      const next = Math.min(
        Math.max((prev[dayIndex] ?? 0) + delta, 0),
        maxPage,
      );
      return { ...prev, [dayIndex]: next };
    });
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[1120px] grid-cols-7 gap-4">
        {columns.map((day) => {
          const maxPage = Math.max(
            0,
            Math.ceil(day.items.length / PAGE_SIZE) - 1,
          );
          const page = Math.min(pageByDay[day.dayIndex] ?? 0, maxPage);
          const visible = day.items.slice(
            page * PAGE_SIZE,
            page * PAGE_SIZE + PAGE_SIZE,
          );

          return (
            <div key={day.dayIndex} className="flex flex-col gap-4">
              <div
                className={`flex items-center justify-between gap-2 border-b pb-3 ${day.isToday ? "border-hanko" : "border-line"}`}
              >
                <div className="flex flex-col gap-1">
                  <h2
                    className={`font-display text-base ${day.isToday ? "text-hanko" : "text-paper"}`}
                  >
                    {day.label}
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ash">
                    {day.isToday ? "Today" : `${day.items.length} airing`}
                  </span>
                </div>

                {maxPage > 0 && (
                  <div className="flex flex-shrink-0 flex-col border border-line">
                    <button
                      type="button"
                      onClick={() => changePage(day.dayIndex, -1, maxPage)}
                      disabled={page === 0}
                      aria-label="Previous"
                      className="flex h-6 w-8 items-center justify-center border-b border-line text-sm text-ash transition-colors hover:bg-line/40 hover:text-hanko disabled:opacity-20"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => changePage(day.dayIndex, 1, maxPage)}
                      disabled={page === maxPage}
                      aria-label="Next"
                      className="flex h-6 w-8 items-center justify-center text-sm text-ash transition-colors hover:bg-line/40 hover:text-hanko disabled:opacity-20"
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                {visible.length === 0 ? (
                  <p className="py-3 text-xs text-ash">Nothing airing.</p>
                ) : (
                  visible.map((item) => {
                    const title =
                      item.anime.title.english ??
                      item.anime.title.romaji ??
                      item.anime.title.native ??
                      "Untitled";
                    return (
                      <Link
                        key={item.anime.id}
                        href={`/anime/${item.anime.id}`}
                        className="group flex items-center gap-2.5 border-b border-line py-2.5 last:border-b-0 hover:bg-line/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-hanko"
                      >
                        <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden bg-line">
                          {item.anime.coverImage.large && (
                            <Image
                              src={item.anime.coverImage.large}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          )}
                          <QuickAddButton
                            anilistId={item.anime.id}
                            initialTracked={item.initialTracked}
                          />
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
                            Ep {item.episode} ·{" "}
                            {TIME_FORMAT.format(new Date(item.airingAt * 1000))}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

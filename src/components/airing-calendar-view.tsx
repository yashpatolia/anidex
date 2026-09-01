"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { QuickAddButton } from "@/components/quick-add-button";
import type { AnilistMedia } from "@/lib/anilist";

// Row height is fixed by the h-14 cover (56px) — that dominates the row's
// height regardless of title/subtitle text, which never wraps to more than
// its own ~36px. py-2.5 (20px) + a 1px border round it out.
const ROW_HEIGHT_PX = 56 + 20 + 1;
// Deliberate breathing room below the last row so it doesn't sit flush
// against the very bottom edge of the viewport.
const BOTTOM_GAP_PX = 32;
const MIN_PAGE_SIZE = 3;
// Used for the very first render (server-rendered, then hydrated) before
// the effect below can measure real layout — picked to be a reasonable
// guess rather than causing a jarring jump once the real value lands.
const DEFAULT_PAGE_SIZE = 10;

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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const listRef = useRef<HTMLDivElement>(null);

  // How many rows actually fit without the page itself needing to scroll —
  // measured from where the row list starts (below the sticky nav, the page
  // header, and this column's own weekday header) down to the bottom of the
  // viewport, minus a bit of bottom breathing room. Recomputed on resize;
  // the effect (not a layout-time calculation) means the very first paint
  // uses DEFAULT_PAGE_SIZE and corrects itself right after mount.
  useEffect(() => {
    function recompute() {
      const top = listRef.current?.getBoundingClientRect().top ?? 0;
      const available = window.innerHeight - top - BOTTOM_GAP_PX;
      setPageSize(Math.max(MIN_PAGE_SIZE, Math.floor(available / ROW_HEIGHT_PX)));
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

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
        {columns.map((day, columnIndex) => {
          const maxPage = Math.max(
            0,
            Math.ceil(day.items.length / pageSize) - 1,
          );
          const page = Math.min(pageByDay[day.dayIndex] ?? 0, maxPage);
          const visible = day.items.slice(
            page * pageSize,
            page * pageSize + pageSize,
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

              <div className="flex flex-col" ref={columnIndex === 0 ? listRef : undefined}>
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

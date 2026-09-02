"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { NotificationItem } from "@/lib/notifications";

function entryTitle(anime: NotificationItem["anime"]): string {
  return anime.title.english ?? anime.title.romaji ?? anime.title.native ?? "";
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setItems(data.items ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Leave whatever was already showing rather than clearing it on a
      // transient fetch failure.
    } finally {
      setLoaded(true);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void load();
  }

  async function openItem(item: NotificationItem) {
    setOpen(false);
    if (!item.read) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      }).catch(() => {});
    }
    router.push(`/anime/${item.anime.id}`);
  }

  async function markAllRead() {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnreadCount(0);
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className="relative flex items-center px-3 py-2 text-ash transition-colors hover:bg-line/40 hover:text-paper"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path
            d="M5 8a5 5 0 0 1 10 0v3.5l1.3 2.2a.6.6 0 0 1-.5.9H4.2a.6.6 0 0 1-.5-.9L5 11.5V8Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M8.2 15.2a1.8 1.8 0 0 0 3.6 0" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-hanko px-0.5 font-mono text-[9px] leading-none text-ink">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 border border-line bg-ink shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-ash">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="font-mono text-[10px] uppercase tracking-widest text-ash transition-colors hover:text-hanko"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!loaded ? (
              <p className="p-3 font-mono text-xs text-ash">Loading...</p>
            ) : items.length === 0 ? (
              <p className="p-3 font-mono text-xs text-ash">No notifications yet.</p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className={`flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-line/40 ${
                        item.read ? "" : "bg-line/20"
                      }`}
                    >
                      {item.anime.coverImage.large && (
                        <span className="relative h-14 w-10 flex-shrink-0 overflow-hidden bg-line">
                          <Image src={item.anime.coverImage.large} alt="" fill sizes="40px" className="object-cover" />
                        </span>
                      )}
                      <span className="flex flex-col gap-0.5 overflow-hidden">
                        <span className="font-body text-sm leading-tight text-paper line-clamp-1">
                          {entryTitle(item.anime)}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wide text-ash">
                          Episode {item.episode} aired &middot; {timeAgo(item.createdAt)}
                        </span>
                      </span>
                      {!item.read && <span className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-hanko" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

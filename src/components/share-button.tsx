"use client";

import { useState } from "react";

// navigator.share is the native OS share sheet (mobile browsers, and
// desktop Safari/Edge) — used when available since it's the better UX;
// everywhere else (desktop Chrome/Firefox) falls back to copying the link,
// with a brief "Copied" confirmation replacing the label.
export function ShareButton({ title, className = "" }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // AbortError when the user just closes the share sheet — nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access denied — no good fallback short of showing the
      // raw URL, which isn't worth the extra UI for how rarely this hits.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`flex items-center gap-1.5 border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:border-hanko hover:text-hanko ${className}`}
    >
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="15" cy="4.5" r="2.25" />
        <circle cx="5" cy="10" r="2.25" />
        <circle cx="15" cy="15.5" r="2.25" />
        <path d="M7.05 8.8 12.95 5.7M7.05 11.2l5.9 3.1" strokeLinecap="round" />
      </svg>
      {copied ? "Copied" : "Share"}
    </button>
  );
}

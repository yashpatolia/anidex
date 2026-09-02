"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FollowButton({ username, initialFollowing }: { username: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function toggle() {
    setPending(true);
    const next = !following;
    setFollowing(next); // optimistic; reverted on failure below
    try {
      const res = await fetch("/api/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error();
      // Follower count shown alongside this button lives in a server
      // component, so it needs a fresh render to reflect the change.
      router.refresh();
    } catch {
      setFollowing(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`border px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors disabled:opacity-50 ${
        following
          ? "border-line text-ash hover:border-hanko hover:text-hanko"
          : "border-hanko bg-hanko text-ink hover:opacity-90"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}

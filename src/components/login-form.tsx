"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

// Auth.js redirects here with ?error=... when OAuth sign-in fails
// server-side.
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: "That AniList account is already linked to a different AniDex account.",
};

function AniListIcon() {
  // AniList's own mark — simplified to a single path at the size this
  // button needs, in the button's own currentColor rather than AniList's
  // brand blue, matching how the Google icon used to be full-color but
  // this button is a plain outlined control like the rest of the form.
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M6.361 2.943 0 21.056h4.942l1.077-3.133H11.4v-3.633H7.234l3.734-11.347z" />
      <path d="M13.837 21.056h6.855c1.86 0 3.308-.554 4.342-1.66 1.033-1.107 1.55-2.573 1.55-4.4V2.943h-4.85v11.949c0 .805-.184 1.42-.552 1.844-.367.417-.902.626-1.605.626h-5.74z" />
    </svg>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const error = OAUTH_ERROR_MESSAGES[searchParams.get("error") ?? ""] ?? null;

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-sm flex-col justify-center gap-8 px-8">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-ash">Sign in</p>
        <h1 className="font-display text-3xl text-paper">Welcome back.</h1>
        <p className="text-sm text-ash">
          AniDex is an AniList client. Sign in with your AniList account and your list stays
          in sync both ways.
        </p>
      </div>

      {error && <p className="font-mono text-xs text-hanko">{error}</p>}

      <button
        onClick={() => signIn("anilist", { redirectTo: "/" })}
        className="flex items-center justify-center gap-2.5 border border-hanko bg-hanko px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
      >
        <AniListIcon />
        Sign in with AniList
      </button>
    </main>
  );
}

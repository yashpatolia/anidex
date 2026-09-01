"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// The email/password path only ever authenticates the seeded dev user
// (see prisma/seed.ts) — there's no real signup flow behind it. Never show
// it in production; Google is the only real login method there.
const SHOW_DEV_LOGIN = process.env.NODE_ENV !== "production";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05l3.02-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-sm flex-col justify-center gap-8 px-8">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-ash">Sign in</p>
        <h1 className="font-display text-3xl text-paper">Welcome back.</h1>
      </div>

      {SHOW_DEV_LOGIN && (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ash">Email</span>
              <input
                type="email"
                placeholder="dev@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-line bg-transparent px-3 py-2 text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ash">Password</span>
              <input
                type="password"
                placeholder="devpassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-line bg-transparent px-3 py-2 text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
              />
            </label>

            {error && <p className="font-mono text-xs text-hanko">{error}</p>}

            <button
              type="submit"
              className="mt-2 border border-hanko bg-hanko px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
            >
              Sign in
            </button>
          </form>

          <p className="font-mono text-[11px] text-ash">
            Dev seed login: dev@example.com / devpassword
          </p>
        </>
      )}

      <div className="flex flex-col gap-4 border-t border-line pt-6">
        <button
          onClick={() => signIn("google", { redirectTo: "/" })}
          className="flex items-center justify-center gap-2.5 border border-line px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-colors hover:border-paper"
        >
          <GoogleIcon />
          Sign in with Google
        </button>
      </div>
    </main>
  );
}

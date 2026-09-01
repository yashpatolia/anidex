"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

      <div className="flex flex-col gap-4 border-t border-line pt-6">
        <button
          onClick={() => signIn("google", { redirectTo: "/" })}
          className="border border-line px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-colors hover:border-paper"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}

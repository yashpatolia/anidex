"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 px-8 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-hanko">Error</p>
      <h1 className="font-display text-3xl text-paper">Something broke.</h1>
      <p className="max-w-sm text-sm text-ash">
        Likely a hiccup fetching anime data. Try again in a moment.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-2 border border-hanko bg-hanko px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
      >
        Try again
      </button>
    </main>
  );
}

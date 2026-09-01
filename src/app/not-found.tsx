import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 px-8 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-ash">404</p>
      <h1 className="font-display text-3xl text-paper">Nothing here.</h1>
      <p className="max-w-sm text-sm text-ash">
        Whatever you were looking for doesn&apos;t exist, or the link is wrong.
      </p>
      <Link
        href="/"
        className="mt-2 border border-hanko bg-hanko px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
      >
        Back home
      </Link>
    </main>
  );
}

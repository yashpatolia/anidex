import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { NavSearch } from "@/components/nav-search";

export async function Nav() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/95">
      <div className="mx-auto grid h-14 w-full max-w-[1800px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-8 2xl:px-16">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-display text-lg tracking-tight text-paper focus:outline-none focus-visible:ring-1 focus-visible:ring-hanko"
          >
            AniDex
          </Link>

          <nav className="hidden items-center sm:flex">
            <Link
              href="/browse"
              className="px-3 py-2 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:bg-line/40 hover:text-paper"
            >
              Browse
            </Link>
            <Link
              href="/seasonal"
              className="px-3 py-2 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:bg-line/40 hover:text-paper"
            >
              Seasonal
            </Link>
          </nav>
        </div>

        <div className="hidden justify-self-center md:block md:w-80 lg:w-96">
          <NavSearch />
        </div>

        <div className="flex items-center justify-end">
          {session?.user ? (
            <>
              <Link
                href="/profile"
                className="hidden px-3 py-2 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:bg-line/40 hover:text-paper sm:block"
              >
                Profile
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
                className="flex"
              >
                <button
                  type="submit"
                  className="px-3 py-2 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:bg-line/40 hover:text-paper"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-paper transition-colors hover:border-hanko hover:text-hanko"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

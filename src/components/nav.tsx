import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { NavSearch } from "@/components/nav-search";
import { MobileMenuToggle } from "@/components/mobile-menu-toggle";
import { NotificationBell } from "@/components/notification-bell";

const linkClass =
  "whitespace-nowrap px-3 py-2 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:bg-line/40 hover:text-paper";

export async function Nav() {
  const session = await auth();

  const signOutForm = (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-1.5 px-3 py-2 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:bg-line/40 hover:text-paper"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 3.5H4.5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1H8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12.5 6.5 16 10l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="16" y1="10" x2="7.3" y2="10" strokeLinecap="round" />
        </svg>
        Sign out
      </button>
    </form>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/95">
      <div className="relative mx-auto flex h-14 w-full max-w-[1800px] items-center justify-between gap-6 px-8 sm:grid sm:grid-cols-[1fr_auto_1fr] 2xl:px-16">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-display text-lg tracking-tight text-paper focus:outline-none focus-visible:ring-1 focus-visible:ring-hanko"
          >
            AniDex
          </Link>

          <nav className="hidden items-center sm:flex">
            <Link href="/browse" className={linkClass}>
              Browse
            </Link>
            <Link href="/seasonal" className={linkClass}>
              Seasonal
            </Link>
            {session?.user && (
              <>
                <Link href="/airing" className={linkClass}>
                  Airing
                </Link>
                <Link href="/recommendations" className={linkClass}>
                  For You
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="hidden justify-self-center md:block md:w-80 lg:w-96">
          <NavSearch />
        </div>

        <div className="flex items-center justify-end gap-1">
          {session?.user ? (
            <>
              <div className="hidden sm:block">
                <NotificationBell />
              </div>
              <Link href="/profile" className={`hidden sm:block ${linkClass}`}>
                Profile
              </Link>
              <Link href="/account" className={`hidden sm:block ${linkClass}`}>
                Account
              </Link>
              <div className="hidden sm:block">{signOutForm}</div>
            </>
          ) : (
            <Link
              href="/login"
              className="hidden border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-paper transition-colors hover:border-hanko hover:text-hanko sm:block"
            >
              Log in
            </Link>
          )}

          {session?.user && (
            <div className="sm:hidden">
              <NotificationBell />
            </div>
          )}

          <MobileMenuToggle>
            <div className="flex flex-col gap-4">
              <NavSearch />

              <nav className="flex flex-col border-t border-line pt-2">
                <Link href="/browse" className={linkClass}>
                  Browse
                </Link>
                <Link href="/seasonal" className={linkClass}>
                  Seasonal
                </Link>
                {session?.user && (
                  <>
                    <Link href="/airing" className={linkClass}>
                      Airing
                    </Link>
                    <Link href="/recommendations" className={linkClass}>
                      For You
                    </Link>
                  </>
                )}
              </nav>

              {session?.user ? (
                <div className="flex flex-col border-t border-line pt-2">
                  <Link href="/profile" className={linkClass}>
                    Profile
                  </Link>
                  <Link href="/account" className={linkClass}>
                    Account
                  </Link>
                  {signOutForm}
                </div>
              ) : (
                <div className="border-t border-line pt-4">
                  <Link
                    href="/login"
                    className="block border border-line px-3 py-2 text-center font-mono text-xs uppercase tracking-widest text-paper transition-colors hover:border-hanko hover:text-hanko"
                  >
                    Log in
                  </Link>
                </div>
              )}
            </div>
          </MobileMenuToggle>
        </div>
      </div>
    </header>
  );
}

// AniList's API terms ask for attribution when displaying their data,
// which is most of what this app shows (titles, cover art, synopses) — the
// linked credit here isn't just politeness.
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line px-8 py-6 2xl:px-16">
      <div className="flex w-full flex-col items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-widest text-ash sm:flex-row">
        <p>© {year} AniDex</p>
        <p>
          Anime data from{" "}
          <a
            href="https://anilist.co"
            target="_blank"
            rel="noreferrer"
            className="text-paper transition-colors hover:text-hanko"
          >
            AniList
          </a>
        </p>
      </div>
    </footer>
  );
}

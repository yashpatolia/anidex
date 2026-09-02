export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line px-8 py-6 2xl:px-16">
      <div className="flex w-full items-center justify-center font-mono text-[11px] uppercase tracking-widest text-ash">
        <p>© {year} AniDex</p>
      </div>
    </footer>
  );
}

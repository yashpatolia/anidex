import { LOGO_GLYPH_LG, LOGO_GLYPH_SM } from "@/lib/logo-paths";

// AniDex's brand mark: a hanko (Japanese personal seal stamp) — a solid
// field with the katakana ア ("A", the "Ani" in AniDex) knocked out. No
// border, no corner radius, no second colour. The accent in this codebase
// is literally named `hanko`, and the score badge in anime-card.tsx is
// already a hanko-styled stamp — this mark states that existing visual
// language once, at brand scale.
//
// The glyph ships as an outlined path, not live text: src/app/layout.tsx
// loads Zen Kaku Gothic New with only the latin subset preloaded
// (deliberately — see the comment there), so a live ア would either not
// render or force an extra font chunk on every page. The two paths
// (src/lib/logo-paths.ts) were extracted from the actual Zen Kaku Gothic
// New Bold outline and verified pixel-for-pixel against a live-text
// reference at each size — LG for >=32px, SM for <32px (the glyph is
// drawn slightly larger at small sizes so its counters stay open instead
// of clogging up).
export type LogoVariant = "default" | "on-paper" | "on-hanko";

const FIELD_CLASS: Record<LogoVariant, string> = {
  default: "fill-hanko",
  "on-paper": "fill-hanko",
  "on-hanko": "fill-ink",
};

const GLYPH_CLASS: Record<LogoVariant, string> = {
  default: "fill-ink",
  "on-paper": "fill-paper",
  "on-hanko": "fill-hanko",
};

export function Logo({
  size = 18,
  variant = "default",
  className = "",
}: {
  size?: number;
  variant?: LogoVariant;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect width="100" height="100" className={FIELD_CLASS[variant]} />
      <path d={size < 32 ? LOGO_GLYPH_SM : LOGO_GLYPH_LG} className={GLYPH_CLASS[variant]} />
    </svg>
  );
}

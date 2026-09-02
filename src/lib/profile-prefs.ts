// Deliberately no Prisma import here — this file is shared with client
// components, and the generated Prisma client is server-only (importing it
// client-side breaks the Turbopack build). Status keys below just mirror the
// WatchStatus enum values as plain strings.

export type SectionKey = "WATCHING" | "COMPLETED" | "PLANNED" | "PAUSED" | "DROPPED";
export type HeaderStyle = "compact" | "banner";

export const MAX_FAVORITES = 6;

export type ProfilePrefs = {
  accentColor: string;
  sections: { key: SectionKey; visible: boolean }[];
  stats: { total: boolean; episodes: boolean; avgScore: boolean; genres: boolean };
  // Whether /u/[username] is visible to anyone, or only the owner. Defaults
  // to false — a list shouldn't become publicly visible just because
  // usernames exist; the owner has to opt in from Profile's Customize panel.
  isPublic: boolean;
  // "banner" shows a full-width image (bannerAnilistId's cover art banner)
  // behind the header; "compact" is the plain solid-background header.
  // Kept separate from bannerAnilistId being set so switching back to
  // compact doesn't lose the picked banner.
  headerStyle: HeaderStyle;
  // One of the owner's own tracked anime (by AniList id) to source the
  // banner image from — no image upload/storage in this app, so the banner
  // is always something already in AniList's own CDN. Null until chosen,
  // or if headerStyle is "compact".
  bannerAnilistId: number | null;
  // Up to MAX_FAVORITES AniList ids, in display order, pinned in a row near
  // the top of the profile. Must also be present in the owner's own list —
  // enforced when saving (src/app/api/profile/route.ts), not here.
  favoriteIds: number[];
};

export const SECTION_LABELS: Record<SectionKey, string> = {
  WATCHING: "Watching",
  COMPLETED: "Completed",
  PLANNED: "Plan to watch",
  PAUSED: "On hold",
  DROPPED: "Dropped",
};

export const DEFAULT_PREFS: ProfilePrefs = {
  accentColor: "#b23a2e",
  sections: [
    { key: "WATCHING", visible: true },
    { key: "COMPLETED", visible: true },
    { key: "PLANNED", visible: true },
    { key: "PAUSED", visible: true },
    { key: "DROPPED", visible: true },
  ],
  stats: { total: true, episodes: true, avgScore: true, genres: true },
  isPublic: false,
  headerStyle: "compact",
  bannerAnilistId: null,
  favoriteIds: [],
};

// A handful of curated swatches for one-click picks, shown alongside a
// native color input for anything else — the palette isn't the only way to
// set accentColor, just the fast path.
export const ACCENT_PALETTE = [
  { name: "Hanko red", value: "#b23a2e" },
  { name: "Indigo", value: "#3b4a8a" },
  { name: "Forest", value: "#3f6b4a" },
  { name: "Ochre", value: "#a97c26" },
  { name: "Plum", value: "#7a3b6b" },
  { name: "Slate teal", value: "#3a6b6b" },
] as const;

// Merges a possibly-partial/stale prefs blob (from JSON in the DB) with
// defaults, so adding new fields later doesn't break existing users' saved
// prefs, and a fresh user with profilePrefs: null gets sane defaults.
export function normalizePrefs(raw: unknown): ProfilePrefs {
  if (!raw || typeof raw !== "object") return DEFAULT_PREFS;
  const r = raw as Partial<ProfilePrefs>;

  const savedSections = Array.isArray(r.sections) ? r.sections : [];
  const savedKeys = new Set(savedSections.map((s) => s.key));
  const sections = [
    ...savedSections.filter((s) => s.key in SECTION_LABELS),
    ...DEFAULT_PREFS.sections.filter((s) => !savedKeys.has(s.key)),
  ];

  return {
    accentColor: r.accentColor ?? DEFAULT_PREFS.accentColor,
    sections: sections.length ? sections : DEFAULT_PREFS.sections,
    stats: { ...DEFAULT_PREFS.stats, ...r.stats },
    isPublic: r.isPublic ?? DEFAULT_PREFS.isPublic,
    headerStyle: r.headerStyle === "banner" ? "banner" : DEFAULT_PREFS.headerStyle,
    bannerAnilistId: typeof r.bannerAnilistId === "number" ? r.bannerAnilistId : DEFAULT_PREFS.bannerAnilistId,
    favoriteIds: Array.isArray(r.favoriteIds)
      ? r.favoriteIds.filter((id): id is number => typeof id === "number").slice(0, MAX_FAVORITES)
      : DEFAULT_PREFS.favoriteIds,
  };
}

// Deliberately no Prisma import here — this file is shared with client
// components, and the generated Prisma client is server-only (importing it
// client-side breaks the Turbopack build). Status keys below just mirror the
// WatchStatus enum values as plain strings.

export type SectionKey = "WATCHING" | "COMPLETED" | "PLANNED" | "PAUSED" | "DROPPED";

export type ProfilePrefs = {
  accentColor: string;
  sections: { key: SectionKey; visible: boolean }[];
  stats: { total: boolean; episodes: boolean; avgScore: boolean; genres: boolean };
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
};

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
  };
}

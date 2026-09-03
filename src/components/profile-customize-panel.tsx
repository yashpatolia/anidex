"use client";

import { useState } from "react";
import Link from "next/link";
import { Combobox } from "@/components/combobox";
import {
  ACCENT_PALETTE,
  MAX_FAVORITES,
  SECTION_LABELS,
  type ProfilePrefs,
  type SectionKey,
} from "@/lib/profile-prefs";
import { entryTitle, type ListEntry as Entry } from "@/lib/list-view";

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

// Custom-styled stand-in for a native checkbox (the native box doesn't
// take theming, and looks out of place next to everything else here) —
// the real <input> stays in the DOM (sr-only) so this is still a real,
// accessible checkbox, just visually replaced.
function Checkbox({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-paper ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="peer sr-only" />
      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center border border-line text-[10px] leading-none text-transparent transition-colors peer-checked:border-hanko peer-checked:bg-hanko peer-checked:text-paper">
        ✓
      </span>
      {children}
    </label>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border border-line p-4">
      <span className="font-mono text-[10px] uppercase tracking-widest text-ash">{label}</span>
      {children}
    </div>
  );
}

function AccentPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {ACCENT_PALETTE.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.name}
            onClick={() => onChange(c.value)}
            className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: c.value,
              borderColor: value === c.value ? c.value : "transparent",
              outline: value === c.value ? `2px solid ${c.value}` : "none",
              outlineOffset: 2,
            }}
          />
        ))}
      </div>
      {/* Keyed on value so picking a swatch (which changes value from the
          outside) remounts this with a fresh initial state, instead of a
          useEffect syncing local state to a prop change. */}
      <HexInput key={value} initial={value} onCommit={onChange} />
    </div>
  );
}

function HexInput({ initial, onCommit }: { initial: string; onCommit: (hex: string) => void }) {
  const [hexInput, setHexInput] = useState(initial);

  function commitHex() {
    const v = hexInput.trim();
    if (HEX_PATTERN.test(v)) onCommit(v);
    else setHexInput(initial); // revert an invalid typed value
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="h-8 w-8 flex-shrink-0 border border-line"
        style={{ backgroundColor: HEX_PATTERN.test(hexInput) ? hexInput : "transparent" }}
      />
      <input
        type="text"
        value={hexInput}
        onChange={(e) => setHexInput(e.target.value)}
        onBlur={commitHex}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="#b23a2e"
        maxLength={7}
        className="w-28 border border-line bg-ink px-2 py-1.5 font-mono text-xs uppercase text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
      />
      <span className="font-mono text-[10px] uppercase tracking-widest text-ash">Or type a hex code</span>
    </div>
  );
}

export function ProfileCustomizePanel({
  username,
  prefs,
  setPrefs,
  entries,
  saving,
  saveError,
  onSave,
}: {
  username: string;
  prefs: ProfilePrefs;
  setPrefs: (prefs: ProfilePrefs) => void;
  entries: Entry[];
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
}) {
  const [favoriteSearch, setFavoriteSearch] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Entries with a bannerImage at all — the only ones that can usefully be
  // picked as a banner source.
  const bannerCandidates = entries.filter((e) => e.anime.bannerImage);

  const favoriteQuery = favoriteSearch.trim().toLowerCase();
  const favoritePickList = favoriteQuery
    ? entries.filter((e) => entryTitle(e).toLowerCase().includes(favoriteQuery))
    : entries;

  function moveSection(index: number, direction: -1 | 1) {
    reorderSections(index, index + direction);
  }

  function reorderSections(from: number, to: number) {
    if (to < 0 || to >= prefs.sections.length || from === to) return;
    const next = [...prefs.sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPrefs({ ...prefs, sections: next });
  }

  function toggleSectionVisible(key: SectionKey) {
    setPrefs({
      ...prefs,
      sections: prefs.sections.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s)),
    });
  }

  function toggleStat(key: keyof ProfilePrefs["stats"]) {
    setPrefs({ ...prefs, stats: { ...prefs.stats, [key]: !prefs.stats[key] } });
  }

  function toggleFavorite(anilistId: number) {
    const already = prefs.favoriteIds.includes(anilistId);
    if (already) {
      setPrefs({ ...prefs, favoriteIds: prefs.favoriteIds.filter((id) => id !== anilistId) });
    } else if (prefs.favoriteIds.length < MAX_FAVORITES) {
      setPrefs({ ...prefs, favoriteIds: [...prefs.favoriteIds, anilistId] });
    }
  }

  return (
    <div className="flex flex-col gap-6 border border-line p-5">
      <p className="font-mono text-[11px] text-ash">
        Username and bio moved to{" "}
        <Link href="/account" className="text-paper underline underline-offset-2 hover:text-hanko">
          Account settings
        </Link>
        .
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section label="Accent color">
          <AccentPicker value={prefs.accentColor} onChange={(accentColor) => setPrefs({ ...prefs, accentColor })} />
        </Section>

        <Section label="Header style">
          <div className="inline-flex self-start border border-line">
            {(["compact", "banner"] as const).map((style, i) => (
              <button
                key={style}
                type="button"
                onClick={() => setPrefs({ ...prefs, headerStyle: style })}
                className={`px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
                  i > 0 ? "border-l border-line" : ""
                } ${prefs.headerStyle === style ? "bg-hanko text-paper" : "text-ash hover:text-paper"}`}
              >
                {style}
              </button>
            ))}
          </div>
          {prefs.headerStyle === "banner" &&
            (bannerCandidates.length === 0 ? (
              <p className="font-mono text-[11px] text-ash">
                Track something with a banner image on AniList to use it here.
              </p>
            ) : (
              <Combobox
                value={prefs.bannerAnilistId != null ? String(prefs.bannerAnilistId) : null}
                onChange={(v) => setPrefs({ ...prefs, bannerAnilistId: v ? Number(v) : null })}
                options={bannerCandidates.map((e) => ({ value: String(e.anime.id), label: entryTitle(e) }))}
                placeholder="Search your list…"
                allowClear
                clearLabel="None"
              />
            ))}
        </Section>

        <Section label={`Favorites (${prefs.favoriteIds.length}/${MAX_FAVORITES})`}>
          <input
            type="search"
            value={favoriteSearch}
            onChange={(e) => setFavoriteSearch(e.target.value)}
            placeholder="Find something in your list to pin"
            className="border-b border-line bg-transparent py-1.5 font-body text-sm text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
          />
          <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
            {favoritePickList.slice(0, 30).map((e) => {
              const checked = prefs.favoriteIds.includes(e.anime.id);
              const disabled = !checked && prefs.favoriteIds.length >= MAX_FAVORITES;
              return (
                <Checkbox key={e.anime.id} checked={checked} disabled={disabled} onChange={() => toggleFavorite(e.anime.id)}>
                  <span className="normal-case tracking-normal">{entryTitle(e)}</span>
                </Checkbox>
              );
            })}
          </div>
        </Section>

        <Section label="Sections shown & order">
          <div className="flex flex-col gap-1">
            {prefs.sections.map((s, i) => (
              <div
                key={s.key}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex != null) reorderSections(dragIndex, i);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`flex items-center gap-2 border border-transparent py-1 transition-opacity ${
                  dragIndex === i ? "opacity-40" : ""
                }`}
              >
                <span className="cursor-grab text-ash active:cursor-grabbing" aria-hidden="true">
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <circle cx="7" cy="5" r="1.3" />
                    <circle cx="13" cy="5" r="1.3" />
                    <circle cx="7" cy="10" r="1.3" />
                    <circle cx="13" cy="10" r="1.3" />
                    <circle cx="7" cy="15" r="1.3" />
                    <circle cx="13" cy="15" r="1.3" />
                  </svg>
                </span>
                <Checkbox checked={s.visible} onChange={() => toggleSectionVisible(s.key)}>
                  {SECTION_LABELS[s.key]}
                </Checkbox>
                <div className="ml-auto flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveSection(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${SECTION_LABELS[s.key]} up`}
                    className="font-mono text-[10px] text-ash transition-colors hover:text-hanko disabled:opacity-20"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(i, 1)}
                    disabled={i === prefs.sections.length - 1}
                    aria-label={`Move ${SECTION_LABELS[s.key]} down`}
                    className="font-mono text-[10px] text-ash transition-colors hover:text-hanko disabled:opacity-20"
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section label="Stats shown">
          <div className="flex flex-col gap-2">
            {(
              [
                ["total", "Total tracked"],
                ["episodes", "Episodes watched"],
                ["avgScore", "Average score"],
                ["genres", "Genre breakdown"],
              ] as const
            ).map(([key, label]) => (
              <Checkbox key={key} checked={prefs.stats[key]} onChange={() => toggleStat(key)}>
                {label}
              </Checkbox>
            ))}
          </div>
        </Section>

        <Section label="Public profile">
          <Checkbox checked={prefs.isPublic} onChange={() => setPrefs({ ...prefs, isPublic: !prefs.isPublic })}>
            Anyone can view this list
          </Checkbox>
          {prefs.isPublic && (
            <p className="font-mono text-[11px] text-ash">
              Visible at{" "}
              <Link href={`/u/${username}`} className="text-paper underline underline-offset-2 hover:text-hanko">
                /u/{username}
              </Link>
            </p>
          )}
        </Section>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="self-start border border-hanko bg-hanko px-5 py-2 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saveError && <span className="font-mono text-xs text-hanko">{saveError}</span>}
      </div>
    </div>
  );
}

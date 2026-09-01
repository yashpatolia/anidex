"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type PreviewRow = {
  anilistId: number;
  title: string;
  coverImage: string | null;
  status: string;
  score: number | null;
  progress: number;
  alreadyTracked: boolean;
};

type UnmatchedEntry = { title: string; reason: string };

type PreviewResult = {
  rows: PreviewRow[];
  newCount: number;
  existingCount: number;
  notInImportCount: number;
  unmatched: UnmatchedEntry[];
};

type CommitResult = { created: number; updated: number; deleted: number; skipped: number };

type Mode = "skipExisting" | "overwriteExisting" | "replaceAll";

const STATUS_LABELS: Record<string, string> = {
  WATCHING: "Watching",
  COMPLETED: "Completed",
  PLANNED: "Plan to watch",
  PAUSED: "On hold",
  DROPPED: "Dropped",
  REWATCHING: "Rewatching",
};

type Source = "mal" | "anilist";
type MalMethod = "file" | "username";

// Custom radio control matching the site's square/hairline design language
// (the native OS radio reads as a jarring default against it).
function ModeRadio({
  checked,
  onChange,
  title,
  description,
  urgent,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
  urgent?: boolean;
}) {
  return (
    <label className="group flex cursor-pointer items-start gap-3 text-xs text-paper">
      <input type="radio" name="import-mode" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className={`mt-0.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center border transition-colors peer-focus-visible:ring-1 peer-focus-visible:ring-hanko peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-ink ${
          checked ? "border-hanko" : "border-line group-hover:border-ash"
        }`}
      >
        {checked && <span className="h-1.5 w-1.5 bg-hanko" />}
      </span>
      <span>
        {title}
        <span className={`block ${urgent ? "text-hanko" : "text-ash"}`}>{description}</span>
      </span>
    </label>
  );
}

export function ImportView() {
  const [source, setSource] = useState<Source>("mal");
  const [malMethod, setMalMethod] = useState<MalMethod>("username");
  const [file, setFile] = useState<File | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [mode, setMode] = useState<Mode>("skipExisting");
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function reset() {
    setPreview(null);
    setResult(null);
    setError(null);
    setMode("skipExisting");
  }

  function switchSource(next: Source) {
    setSource(next);
    setFile(null);
    setUsername("");
    reset();
  }

  function switchMalMethod(next: MalMethod) {
    setMalMethod(next);
    setFile(null);
    setUsername("");
    reset();
  }

  async function handlePreview() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      let res: Response;
      if (source === "mal" && malMethod === "file") {
        if (!file) {
          setError("Choose your MAL export file first.");
          return;
        }
        const xml = await file.text();
        res = await fetch("/api/import/mal/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xml }),
        });
      } else if (source === "mal") {
        if (!username.trim()) {
          setError("Enter your MyAnimeList username first.");
          return;
        }
        res = await fetch("/api/import/mal-account/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim() }),
        });
      } else {
        if (!username.trim()) {
          setError("Enter an AniList username first.");
          return;
        }
        res = await fetch("/api/import/anilist/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim() }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong reading that list.");
        return;
      }
      setPreview(data);
    } catch {
      setError("Something went wrong reading that list.");
    } finally {
      setLoading(false);
    }
  }

  function handleCommitClick() {
    if (!preview) return;
    if (mode === "replaceAll" && preview.notInImportCount > 0) {
      setConfirmingDelete(true);
      return;
    }
    runCommit();
  }

  async function runCommit() {
    if (!preview) return;
    setConfirmingDelete(false);
    setCommitting(true);
    setError(null);
    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: preview.rows.map((r) => ({
            anilistId: r.anilistId,
            status: r.status,
            score: r.score,
            progress: r.progress,
          })),
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed.");
        return;
      }
      setResult(data);
    } catch {
      setError("Import failed.");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-8 py-12">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-ash">Import</p>
        <h1 className="font-display text-3xl text-paper">Bring your list with you.</h1>
        <p className="max-w-lg text-sm text-ash">
          Import from MyAnimeList or AniList. Nothing is written until you review and confirm.
          Entries already on your list are skipped by default.
        </p>
      </div>

      <div className="flex gap-2 border-b border-line pb-px">
        {(["mal", "anilist"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => switchSource(s)}
            className={`border-b-2 px-1 pb-3 font-mono text-xs uppercase tracking-widest transition-colors ${
              source === s ? "border-hanko text-paper" : "border-transparent text-ash hover:text-paper"
            }`}
          >
            {s === "mal" ? "MyAnimeList" : "AniList"}
          </button>
        ))}
      </div>

      {source === "mal" ? (
        <div key="mal" className="flex flex-col gap-4">
          <div className="flex gap-4 font-mono text-[11px] uppercase tracking-widest">
            {(["username", "file"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMalMethod(m)}
                className={malMethod === m ? "text-hanko" : "text-ash transition-colors hover:text-paper"}
              >
                {m === "username" ? "By username" : "Upload export file"}
              </button>
            ))}
          </div>

          {malMethod === "username" ? (
            <div key="mal-username" className="flex flex-col gap-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ash">
                MyAnimeList username
              </span>
              <p className="text-xs text-ash">Their anime list must be public.</p>
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  reset();
                }}
                className="max-w-xs border border-line bg-transparent px-3 py-2 text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
              />
            </div>
          ) : (
            <div key="mal-file" className="flex flex-col gap-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ash">
                MAL export file (.xml)
              </span>
              <p className="text-xs text-ash">
                Use this if your list is private. On MyAnimeList: Profile → List → Export, or go
                directly to <span className="text-paper">myanimelist.net/panel.php?go=export</span>.
                Choose your anime list, request it, then download and select the file it emails
                you here.
              </p>
              <input
                type="file"
                accept=".xml"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  reset();
                }}
                className="border border-line bg-transparent px-3 py-2 font-mono text-xs text-paper file:mr-3 file:border-0 file:bg-line file:px-3 file:py-1.5 file:font-mono file:text-xs file:uppercase file:tracking-widest file:text-paper"
              />
            </div>
          )}
        </div>
      ) : (
        <div key="anilist" className="flex flex-col gap-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-ash">
            AniList username
          </span>
          <p className="text-xs text-ash">Their anime list must be public.</p>
          <input
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              reset();
            }}
            className="max-w-xs border border-line bg-transparent px-3 py-2 text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handlePreview}
        disabled={loading}
        className="self-start border border-hanko bg-hanko px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {loading ? "Reading…" : "Preview"}
      </button>

      {error && <p className="font-mono text-xs text-hanko">{error}</p>}

      {preview && !result && (
        <div className="flex flex-col gap-5 border-t border-line pt-6">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 font-mono text-xs uppercase tracking-widest text-ash">
            <span>
              <span className="text-paper">{preview.newCount}</span> new
            </span>
            <span>
              <span className="text-paper">{preview.existingCount}</span> already tracked
            </span>
            {preview.unmatched.length > 0 && (
              <span>
                <span className="text-paper">{preview.unmatched.length}</span> unmatched
              </span>
            )}
          </div>

          {preview.rows.length === 0 ? (
            <p className="text-sm text-ash">Nothing to import.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-line">
              <table className="w-full text-left text-sm">
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.anilistId} className="border-b border-line last:border-b-0">
                      <td className="w-10 p-2">
                        {row.coverImage && (
                          <Image
                            src={row.coverImage}
                            alt=""
                            width={28}
                            height={40}
                            className="h-10 w-7 object-cover"
                          />
                        )}
                      </td>
                      <td className="p-2 text-paper">{row.title}</td>
                      <td className="whitespace-nowrap p-2 font-mono text-[11px] uppercase tracking-wide text-ash">
                        {STATUS_LABELS[row.status] ?? row.status}
                      </td>
                      <td className="whitespace-nowrap p-2 font-mono text-[11px] text-ash">
                        {row.score ? `${row.score}/10 · ` : ""}ep {row.progress}
                      </td>
                      <td className="whitespace-nowrap p-2 text-right font-mono text-[10px] uppercase tracking-widest">
                        {row.alreadyTracked ? (
                          <span className="text-ash">Update</span>
                        ) : (
                          <span className="text-hanko">New</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.unmatched.length > 0 && (
            <details className="text-xs text-ash">
              <summary className="cursor-pointer font-mono uppercase tracking-widest">
                {preview.unmatched.length} entries couldn&apos;t be matched
              </summary>
              <ul className="mt-2 flex flex-col gap-1">
                {preview.unmatched.map((u, i) => (
                  <li key={i}>{u.title}</li>
                ))}
              </ul>
            </details>
          )}

          {preview.rows.length > 0 && (
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ash">
                What to do with entries already on your list
              </legend>
              <ModeRadio
                checked={mode === "skipExisting"}
                onChange={() => setMode("skipExisting")}
                title="Only add new entries"
                description="Anything already tracked is left exactly as-is. Nothing is ever deleted."
              />
              <ModeRadio
                checked={mode === "overwriteExisting"}
                onChange={() => setMode("overwriteExisting")}
                title="Add new, and update existing entries with this data"
                description={`Status/score/progress get replaced for the ${preview.existingCount} already tracked. Still never deletes anything.`}
              />
              <ModeRadio
                checked={mode === "replaceAll"}
                onChange={() => setMode("replaceAll")}
                title="Replace my entire list with this import"
                urgent
                description={
                  preview.notInImportCount > 0
                    ? `Deletes ${preview.notInImportCount} ${
                        preview.notInImportCount === 1 ? "entry" : "entries"
                      } currently on your list that aren't in this import. Can't be undone.`
                    : "Nothing to delete. Everything you track is already in this import."
                }
              />
            </fieldset>
          )}

          {preview.rows.length > 0 && (
            <button
              type="button"
              onClick={handleCommitClick}
              disabled={committing}
              className="self-start border border-hanko bg-hanko px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {committing
                ? "Importing…"
                : mode === "skipExisting"
                  ? `Import ${preview.newCount} entries`
                  : `Import ${preview.rows.length} entries`}
            </button>
          )}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4 border-t border-line pt-6">
          <p className="text-sm text-paper">
            Done. {result.created} added, {result.updated} updated
            {result.deleted > 0 ? `, ${result.deleted} deleted` : ""}
            {result.skipped > 0 ? `, ${result.skipped} left as-is` : ""}.
          </p>
          <Link
            href="/profile"
            className="self-start border border-hanko bg-hanko px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
          >
            View your list
          </Link>
        </div>
      )}

      {confirmingDelete && preview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 px-6"
          onClick={() => setConfirmingDelete(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-5 border border-hanko bg-ink p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2">
              <p className="font-mono text-xs uppercase tracking-widest text-hanko">
                This can&apos;t be undone
              </p>
              <p className="text-sm text-paper">
                Permanently delete {preview.notInImportCount}{" "}
                {preview.notInImportCount === 1 ? "entry" : "entries"} currently on your list
                that aren&apos;t in this import?
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="border border-line px-4 py-2 font-mono text-xs uppercase tracking-widest text-paper transition-colors hover:border-ash"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runCommit}
                className="border border-hanko bg-hanko px-4 py-2 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
              >
                Delete &amp; import
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

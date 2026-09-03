"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AvatarUpload } from "@/components/avatar-upload";

function fieldClass() {
  return "border border-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none";
}

function labelClass() {
  return "font-mono text-[10px] uppercase tracking-widest text-ash";
}

export function AccountView({
  bio,
  email,
  username,
  anilistUsername,
  avatarSrc,
  hasCustomAvatar,
}: {
  bio: string | null;
  email: string | null;
  username: string | null;
  // The AniList account this AniDex account is linked to — AniList is the
  // only sign-in method, so unlike the old multi-provider setup this is
  // never absent for a real session, but stays nullable for the type to be
  // honest about a row that somehow lost its Account link.
  anilistUsername: string | null;
  avatarSrc: string | null;
  hasCustomAvatar: boolean;
}) {
  const router = useRouter();

  // Bio — username isn't editable here (see the Username field below), so
  // there's nothing to track for it beyond the initial value already passed
  // in.
  const initialUsername = username ?? "";
  const [displayBio, setDisplayBio] = useState(bio ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Delete account
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveProfile() {
    setProfileError(null);
    setProfileSaved(false);

    setProfileSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: displayBio }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setProfileError(data?.error ?? "Something went wrong.");
        return;
      }
      setProfileSaved(true);
      router.refresh();
    } finally {
      setProfileSaving(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        setDeleting(false);
        setConfirmingDelete(false);
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-8 py-12">
      <div className="flex flex-col gap-2 border-b border-line pb-6">
        <p className={labelClass()}>Account</p>
        <h1 className="font-display text-3xl text-paper">Settings</h1>
        {email && <p className="text-sm text-ash">{email}</p>}
      </div>

      {/* Username / bio */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg text-paper">Profile</h2>

        <AvatarUpload username={initialUsername || "?"} initialSrc={avatarSrc} initialHasCustom={hasCustomAvatar} />

        <div className="flex flex-col gap-1.5">
          <span className={labelClass()}>Username</span>
          <p className="font-mono text-sm text-paper">@{initialUsername}</p>
          <p className="text-xs text-ash">Set from your AniList username, not changeable here.</p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass()}>Bio</span>
          <textarea
            value={displayBio}
            onChange={(e) => {
              setDisplayBio(e.target.value);
              setProfileSaved(false);
            }}
            maxLength={280}
            rows={3}
            placeholder="A few lines about your taste in anime"
            className={`resize-none ${fieldClass()}`}
          />
        </label>
        {profileError && <p className="font-mono text-xs text-hanko">{profileError}</p>}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveProfile}
            disabled={profileSaving}
            className="self-start border border-hanko bg-hanko px-5 py-2 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {profileSaving ? "Saving…" : "Save"}
          </button>
          {profileSaved && (
            <span className="font-mono text-xs text-ash">Saved.</span>
          )}
        </div>
        <p className="font-mono text-[11px] text-ash">
          Accent color, sections, and stats are customized from your{" "}
          <Link
            href="/profile"
            className="text-paper underline underline-offset-2 hover:text-hanko"
          >
            list
          </Link>{" "}
          instead.
        </p>
      </section>

      {/* Sign-in */}
      <section className="flex flex-col gap-3 border-t border-line pt-8">
        <h2 className="font-display text-lg text-paper">Sign-in</h2>
        <p className="text-sm text-ash">
          Linked to your AniList account
          {anilistUsername && (
            <>
              {" "}
              <span className="font-mono text-paper">@{anilistUsername}</span>
            </>
          )}
          . Your list stays in sync with AniList both ways.
        </p>
      </section>

      {/* Delete account */}
      <section className="flex flex-col gap-3 border-t border-line pt-8">
        <h2 className="font-display text-lg text-paper">Danger zone</h2>
        <p className="text-sm text-ash">
          Permanently delete your account and everything tracked on your list.
          This can&apos;t be undone.
        </p>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="self-start border border-line px-5 py-2 font-mono text-xs uppercase tracking-widest text-paper transition-colors hover:border-hanko hover:text-hanko"
        >
          Delete account
        </button>
      </section>

      {confirmingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 px-6"
          onClick={() => !deleting && setConfirmingDelete(false)}
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
                Permanently delete your account and every anime on your list?
                You&apos;ll be signed out immediately.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="border border-line px-4 py-2 font-mono text-xs uppercase tracking-widest text-paper transition-colors hover:border-ash disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleting}
                className="border border-hanko bg-hanko px-4 py-2 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { isValidUsername } from "@/lib/username";

function fieldClass() {
  return "border border-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-ash/60 focus:border-hanko focus:outline-none";
}

function labelClass() {
  return "font-mono text-[10px] uppercase tracking-widest text-ash";
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
};

export function AccountView({
  name,
  bio,
  email,
  username,
  usernameAutoAssigned,
  hasPassword,
  providers,
}: {
  name: string | null;
  bio: string | null;
  email: string | null;
  username: string | null;
  usernameAutoAssigned: boolean;
  hasPassword: boolean;
  providers: string[];
}) {
  const router = useRouter();

  // Display name / bio / username
  const initialUsername = username ?? "";
  const [displayName, setDisplayName] = useState(name ?? "");
  const [displayBio, setDisplayBio] = useState(bio ?? "");
  const [displayUsername, setDisplayUsername] = useState(initialUsername);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Delete account
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveProfile() {
    setProfileError(null);
    setProfileSaved(false);

    const usernameChanged = displayUsername !== initialUsername;
    if (usernameChanged && !isValidUsername(displayUsername)) {
      setProfileError("Username must be 4-24 characters: lowercase letters, numbers, underscore.");
      return;
    }

    setProfileSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          bio: displayBio,
          ...(usernameChanged ? { username: displayUsername } : {}),
        }),
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

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hasPassword ? { currentPassword, newPassword } : { newPassword },
        ),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPasswordError(data?.error ?? "Something went wrong.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      router.refresh();
    } finally {
      setPasswordSaving(false);
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

      {/* Display name / bio / username */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg text-paper">Profile</h2>

        {usernameAutoAssigned && !nudgeDismissed && (
          <div className="flex items-start justify-between gap-4 border border-line bg-line/20 px-4 py-3">
            <p className="text-sm text-paper">
              We picked <span className="font-mono">@{initialUsername}</span> for you — feel free to
              change it below.
            </p>
            <button
              type="button"
              onClick={() => setNudgeDismissed(true)}
              className="flex-shrink-0 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:text-paper"
            >
              Dismiss
            </button>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className={labelClass()}>Username</span>
          <input
            value={displayUsername}
            onChange={(e) => {
              setDisplayUsername(e.target.value.toLowerCase());
              setProfileSaved(false);
            }}
            maxLength={24}
            className={`max-w-xs ${fieldClass()}`}
          />
        </label>

        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass()}>Display name</span>
            <input
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setProfileSaved(false);
              }}
              maxLength={60}
              className={fieldClass()}
            />
          </label>
          <label className="flex flex-[2] flex-col gap-1.5">
            <span className={labelClass()}>Bio</span>
            <input
              value={displayBio}
              onChange={(e) => {
                setDisplayBio(e.target.value);
                setProfileSaved(false);
              }}
              maxLength={280}
              placeholder="A line about your taste in anime"
              className={fieldClass()}
            />
          </label>
        </div>
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

      {/* Sign-in methods */}
      <section className="flex flex-col gap-3 border-t border-line pt-8">
        <h2 className="font-display text-lg text-paper">Sign-in methods</h2>
        <ul className="flex flex-col gap-1.5 font-mono text-xs uppercase tracking-wide text-paper">
          {providers.map((p) => (
            <li key={p}>{PROVIDER_LABELS[p] ?? p}</li>
          ))}
          {hasPassword && <li>Password</li>}
        </ul>
        {!providers.includes("google") && (
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/account" })}
            className="self-start border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:border-hanko hover:text-hanko"
          >
            Link Google account
          </button>
        )}
      </section>

      {/* Change / set password */}
      <section className="flex flex-col gap-4 border-t border-line pt-8">
        <h2 className="font-display text-lg text-paper">
          {hasPassword ? "Change password" : "Set a password"}
        </h2>
        {!hasPassword && (
          <p className="text-sm text-ash">
            You currently sign in with Google only. Add a password so you can
            also sign in with your email.
          </p>
        )}
        <form onSubmit={changePassword} className="flex flex-col gap-4">
          {hasPassword && (
            <label className="flex flex-col gap-1.5">
              <span className={labelClass()}>Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={fieldClass()}
              />
            </label>
          )}
          <div className="flex flex-col gap-4 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={labelClass()}>New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                className={fieldClass()}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={labelClass()}>Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                className={fieldClass()}
              />
            </label>
          </div>
          {passwordError && (
            <p className="font-mono text-xs text-hanko">{passwordError}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={passwordSaving}
              className="self-start border border-hanko bg-hanko px-5 py-2 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {passwordSaving
                ? "Saving…"
                : hasPassword
                  ? "Update password"
                  : "Set password"}
            </button>
            {passwordSaved && (
              <span className="font-mono text-xs text-ash">
                Password saved.
              </span>
            )}
          </div>
        </form>
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

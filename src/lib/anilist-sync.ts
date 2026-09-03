// Writes a signed-in user's list changes back to their real AniList account
// via GraphQL mutations, using the OAuth access token Auth.js's Prisma
// adapter already stored on their "anilist" Account row when they signed
// in (see src/lib/auth.ts). This is what makes AniDex a client that keeps
// AniList itself in sync, not an independent competing database — see
// .claude-session-state.md for the ToS reasoning this is built on.
//
// IMPORTANT — built entirely from documented behavior, not verified live:
// AniList's API is currently down ("temporarily disabled due to severe
// stability issues", confirmed by hitting graphql.anilist.co directly
// while building this). Introspection and trial calls are both blocked.
// Two things below are genuine unknowns until it's back up, flagged where
// they matter rather than silently assumed:
//   1. Score scale — AniList's score mutation argument is interpreted
//      according to the user's own AniList profile scoreFormat setting
//      (POINT_10, POINT_100, POINT_5, etc., configurable per-user on
//      AniList itself), not something this app controls. Sending our
//      1-10 score as-is is only correct for a POINT_10 profile. Whether
//      SaveMediaListEntry accepts a format-independent field (e.g. a raw/
//      100-point-normalized argument) to sidestep this needs checking
//      against the live schema once it's reachable again.
//   2. Deleting a list entry needs AniList's own list-entry id (not the
//      media id) — see deleteListEntryFromAnilist below.
import { prisma } from "@/lib/prisma";
import { getAnilistUserList } from "@/lib/anilist";
import { WatchStatus } from "@/generated/prisma/client";

const ANILIST_URL = "https://graphql.anilist.co";

// Our WatchStatus -> AniList's MediaListStatus enum. Names differ for two
// of six: WATCHING -> CURRENT, REWATCHING -> REPEATING.
const STATUS_TO_ANILIST: Record<WatchStatus, string> = {
  WATCHING: "CURRENT",
  COMPLETED: "COMPLETED",
  PLANNED: "PLANNING",
  DROPPED: "DROPPED",
  PAUSED: "PAUSED",
  REWATCHING: "REPEATING",
};

// Reverse of the above, for the initial-import direction — see
// importInitialAnilistList.
const ANILIST_STATUS_TO_OURS: Record<string, WatchStatus> = {
  CURRENT: WatchStatus.WATCHING,
  PLANNING: WatchStatus.PLANNED,
  COMPLETED: WatchStatus.COMPLETED,
  DROPPED: WatchStatus.DROPPED,
  PAUSED: WatchStatus.PAUSED,
  REPEATING: WatchStatus.REWATCHING,
};

class AnilistSyncError extends Error {}

async function getAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "anilist" },
    select: { access_token: true, expires_at: true },
  });
  if (!account?.access_token) return null;
  // AniList tokens are long-lived (1yr) with no refresh token — an expired
  // one just means the user needs to sign in again; nothing to refresh
  // here. See src/lib/auth.ts's provider config for the same note.
  if (account.expires_at && account.expires_at * 1000 < Date.now()) return null;
  return account.access_token;
}

async function anilistMutate<T>(
  accessToken: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new AnilistSyncError(json.errors?.[0]?.message ?? `AniList sync failed (${res.status})`);
  }
  return json.data;
}

// Fire-and-log, not fire-and-throw: a failed AniList sync should never
// block or roll back the local write, since AniDex's own database stays
// the source of truth the app itself reads from. This is a real reliability
// gap for now — a failed sync here is just logged, not retried or queued —
// worth a proper retry mechanism before relying on this for anything
// beyond a best-effort mirror. Returns whether the sync succeeded so
// callers can decide whether to surface anything to the user.
export async function syncListEntryToAnilist(
  userId: string,
  anilistId: number,
  entry: { status: WatchStatus; score: number | null; progress: number },
): Promise<boolean> {
  try {
    const token = await getAccessToken(userId);
    if (!token) return false;

    const mutation = `
      mutation ($mediaId: Int, $status: MediaListStatus, $score: Float, $progress: Int) {
        SaveMediaListEntry(mediaId: $mediaId, status: $status, score: $score, progress: $progress) {
          id
        }
      }
    `;
    await anilistMutate(token, mutation, {
      mediaId: anilistId,
      status: STATUS_TO_ANILIST[entry.status],
      // See file comment #1 — correct only if the user's AniList profile
      // uses POINT_10 scoring. Null score omits the argument rather than
      // sending 0, which would zero out an existing AniList score.
      score: entry.score ?? undefined,
      progress: entry.progress,
    });
    return true;
  } catch (err) {
    console.error(`AniList sync failed for user ${userId}, anime ${anilistId}:`, err);
    return false;
  }
}

export async function deleteListEntryFromAnilist(userId: string, anilistId: number): Promise<boolean> {
  try {
    const token = await getAccessToken(userId);
    if (!token) return false;

    // DeleteMediaListEntry needs AniList's own list-entry id, not the media
    // id — look it up via the mediaListEntry field on Media (only resolves
    // for the authenticated user; see docs.anilist.co/guide/graphql/
    // queries/media-list). A null result means there's nothing there to
    // delete (already removed, or never synced), not an error.
    const lookup = await anilistMutate<{ Media: { mediaListEntry: { id: number } | null } | null }>(
      token,
      `query ($mediaId: Int) { Media(id: $mediaId) { mediaListEntry { id } } }`,
      { mediaId: anilistId },
    );
    const entryId = lookup.Media?.mediaListEntry?.id;
    if (entryId == null) return true;

    await anilistMutate(token, `mutation ($id: Int) { DeleteMediaListEntry(id: $id) { deleted } }`, {
      id: entryId,
    });
    return true;
  } catch (err) {
    console.error(`AniList delete-sync failed for user ${userId}, anime ${anilistId}:`, err);
    return false;
  }
}

// One-time pull of a user's existing AniList list into AnimeListEntry —
// called from auth.ts's signIn event, gated on isNewUser, so this only
// ever runs once per AniList account's first sign-in. Without this, a
// brand-new AniDex account starts with an empty list even for someone
// who's tracked hundreds of anime on real AniList for years, which would
// make "AniDex is an AniList client" feel broken on the very first login.
// Uses the existing public (unauthenticated) getAnilistUserList — the
// same function the manual "Import from AniList" feature already used —
// rather than an authenticated MediaListCollection query, since it's
// simpler and this only needs to work for public/unlisted lists anyway
// (a private list would need the access token here instead; not handled).
//
// skipDuplicates makes this safe to re-run without side effects (e.g. if
// signIn's isNewUser flag were ever wrong) — it will never overwrite an
// entry the user has already started editing locally.
export async function importInitialAnilistList(userId: string, anilistUsername: string): Promise<void> {
  try {
    const entries = await getAnilistUserList(anilistUsername);
    if (entries.length === 0) return;

    await prisma.animeListEntry.createMany({
      data: entries.map((e) => ({
        userId,
        anilistId: e.anilistId,
        status: ANILIST_STATUS_TO_OURS[e.status] ?? WatchStatus.PLANNED,
        score: e.score > 0 ? Math.round(e.score) : null,
        progress: e.progress,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    // Best-effort — a failed initial import shouldn't block sign-in
    // itself. The user's list just starts empty and they can use the
    // existing manual "Import from AniList" flow as a fallback.
    console.error(`Initial AniList import failed for user ${userId} (@${anilistUsername}):`, err);
  }
}

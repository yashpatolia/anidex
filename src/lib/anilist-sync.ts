// Writes a signed-in user's list changes back to their real AniList account
// via GraphQL mutations, using the OAuth access token Auth.js's Prisma
// adapter already stored on their "anilist" Account row when they signed
// in (see src/lib/auth.ts). This is what makes AniDex a client that keeps
// AniList itself in sync, not an independent competing database — AniList
// is the *only* place list data lives now (see anilist-client.ts's file
// comment); this module is the one place still allowed to write to it,
// since a write needs the caller's own access token, which never leaves
// the server.
//
// Score scale: AniList's score mutation argument is interpreted according
// to the user's own AniList profile scoreFormat setting (POINT_10,
// POINT_100, POINT_5, etc.), not something this app controls — sending our
// 1-10 score as-is is only correct for a POINT_10 profile. Reads
// side-step this entirely (anilist-client.ts's queries all pass
// `score(format: POINT_10)`, letting AniList itself do the conversion),
// but a *write* has no such argument on SaveMediaListEntry — sending our
// 1-10 value as-is is a known gap for anyone whose AniList profile isn't
// POINT_10.
import { prisma } from "@/lib/prisma";
import { STATUS_TO_ANILIST, type WatchStatus } from "@/lib/anilist-shared";

const ANILIST_URL = "https://graphql.anilist.co";

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Every write goes through this one process-wide gate, spaced out to stay
// under AniList's ~30 req/min limit with real headroom (28.5/min at this
// spacing) — unlike reads (anilist-client.ts, one call per visitor's own
// browser/IP), every write shares this one server process's IP, so writes
// from different users' actions genuinely do compete for the same budget.
// Matters most for a bulk import (syncManyToAnilist below) pushing
// hundreds of mutations in a row; a single one-off edit just waits at most
// ~2s behind whatever else happened to be writing at the same moment.
let lastAnilistWriteAt = 0;
const MIN_WRITE_INTERVAL_MS = 2100;

async function throttleWrite() {
  const wait = MIN_WRITE_INTERVAL_MS - (Date.now() - lastAnilistWriteAt);
  if (wait > 0) await sleep(wait);
  lastAnilistWriteAt = Date.now();
}

async function anilistMutate<T>(
  accessToken: string,
  query: string,
  variables: Record<string, unknown>,
  attempt = 1,
): Promise<T> {
  await throttleWrite();
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429 && attempt <= 3) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const backoff = (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1500) + attempt * 500;
    await sleep(backoff);
    return anilistMutate<T>(accessToken, query, variables, attempt + 1);
  }

  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new AnilistSyncError(json.errors?.[0]?.message ?? `AniList sync failed (${res.status})`);
  }
  return json.data;
}

const SAVE_MUTATION = `
  mutation ($mediaId: Int, $status: MediaListStatus, $score: Float, $progress: Int) {
    SaveMediaListEntry(mediaId: $mediaId, status: $status, score: $score, progress: $progress) {
      id
    }
  }
`;

// Fire-and-log, not fire-and-throw: the caller (an API route) still learns
// whether this succeeded via the return value and can surface that to the
// UI, but a thrown AniList error never propagates past this module — there
// is no local write left to roll back, so the only thing a caller can do
// with a failure is tell the user to retry. This is a real reliability gap
// for now — a failed sync here is just logged, not retried beyond the
// automatic 429 backoff above, or queued — worth a proper retry mechanism
// before relying on this for anything beyond best-effort.
export async function syncListEntryToAnilist(
  userId: string,
  anilistId: number,
  entry: { status: WatchStatus; score: number | null; progress: number },
): Promise<boolean> {
  try {
    const token = await getAccessToken(userId);
    if (!token) return false;

    await anilistMutate(token, SAVE_MUTATION, {
      mediaId: anilistId,
      status: STATUS_TO_ANILIST[entry.status],
      // See this file's header comment — correct only if the user's
      // AniList profile uses POINT_10 scoring. Null score omits the
      // argument rather than sending 0, which would zero out an existing
      // AniList score.
      score: entry.score ?? undefined,
      progress: entry.progress,
    });
    return true;
  } catch (err) {
    console.error(`AniList sync failed for user ${userId}, anime ${anilistId}:`, err);
    return false;
  }
}

// Status-only write for quick-add (see quick-add/route.ts): omitting
// score/progress entirely, not re-sending whatever they already are, is
// what makes this safe now that AniList is the only copy of those values —
// there's no local row left to read them from first, so the mutation
// simply never mentions them, and AniList leaves fields it wasn't sent
// unchanged (the same assumption the null-score omission above already
// relies on).
export async function syncStatusOnlyToAnilist(userId: string, anilistId: number, status: WatchStatus): Promise<boolean> {
  try {
    const token = await getAccessToken(userId);
    if (!token) return false;

    await anilistMutate(token, SAVE_MUTATION, { mediaId: anilistId, status: STATUS_TO_ANILIST[status] });
    return true;
  } catch (err) {
    console.error(`AniList status sync failed for user ${userId}, anime ${anilistId}:`, err);
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

export type BulkSyncResult = { pushed: number; deleted: number; failed: number };

// Bulk push for /api/import/commit — throttled the same way every other
// write is (anilistMutate above), just called in a plain sequential loop
// here so a big import (hundreds of entries) doesn't fire them all at once
// and blow straight through the per-request throttle's queue. A large
// import can genuinely take minutes this way (hundreds of entries at
// ~28/min); the commit route doesn't await this to completion for that
// reason — see its own comment.
export async function syncManyToAnilist(
  userId: string,
  toWrite: { anilistId: number; status: WatchStatus; score: number | null; progress: number }[],
  toDelete: number[],
): Promise<BulkSyncResult> {
  let pushed = 0;
  let deleted = 0;
  let failed = 0;

  for (const entry of toWrite) {
    const ok = await syncListEntryToAnilist(userId, entry.anilistId, entry);
    if (ok) pushed++;
    else failed++;
  }
  for (const anilistId of toDelete) {
    const ok = await deleteListEntryFromAnilist(userId, anilistId);
    if (ok) deleted++;
    else failed++;
  }

  return { pushed, deleted, failed };
}

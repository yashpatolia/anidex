# Roadmap

Features scoped for later, not yet built. Ordered roughly by dependency, not priority.

## Account settings page — mostly done
`/account`: display name/bio (moved off Profile), change password, set a password for
Google-only accounts, delete account, list of linked sign-in methods — all shipped.
- Still open: actual link/unlink of Google OAuth (an unlink button is deferred until it can't
  strand a user with no way back in — revisit once every account is guaranteed to have at
  least one other verified sign-in method)

## UI/UX polish batch
Flagged 2026-09-01, not yet scoped in detail — nothing currently open here.

Also flagged during the original roadmap discussion, not selected for this batch but worth remembering:
- Notes field on list entries (schema already supports it, `AnimeListEntry.notes`, just needs UI)
- Rewatch tracking surfaced distinctly (`REWATCHING` status exists, currently folded into "Watching")
- Studio breakdown stat on Profile (same pattern as existing genre breakdown)
- Total watch time stat (`episodes watched × cached duration`)
- Scheduled jobs for `AnimeTitle` index refresh and `AnimeCache` warming (currently manual scripts)
- Sequel-announced notifications (new episode airing shipped, see below; this needs separate change-detection infrastructure)
- Activity feed and reviews/comments (the rest of the social layer beyond following, see below) — separate product decisions, not started

## Notifications (new episode airing) — shipped
Bell icon on the nav with a dropdown, backed by a persistent inbox (`Notification` table) with
read/unread state, not a live-computed panel. Generated lazily on bell-open (no scheduled job
exists yet): checks the signed-in user's Watching/Rewatching list against AniList's airing data
and inserts a row for any episode aired since their last logged progress, capped at 5 episodes of
backlog per anime so a long-unwatched show doesn't flood the inbox on first sync.

## Following — shipped
Follow/unfollow between users, gated to public profiles only (the Follow button only appears on
`/u/[username]`, which already only exists for public profiles). Follower/following counts on the
profile page link to dedicated `/u/[username]/followers` and `/u/[username]/following` pages, each
with a Follow button per row. `/people` (linked from the nav) is a username search for finding and
following people directly. No activity feed yet (see above) - following is just the relationship
for now.

## Profile page unification — shipped
`/profile` and `/u/[username]` used to be two separate components (`ProfileView` and
`PublicProfileView`) that had already drifted apart once. `/profile` now redirects to
`/u/[username]` for the signed-in user, and both routes render the same `ProfilePageView`
component - the owner's editable view and everyone else's read-only view differ only by an
`isOwner` flag, so they can't drift again. The owner can also now view their own profile even
while it's set to private; everyone else still gets the same 404 as an unknown username.

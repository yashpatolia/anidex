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
with a Follow button per row. Finding people to follow is done through the nav search bar (see
below), not a separate page. No activity feed yet (see above) - following is just the relationship
for now.

## Unified nav search — shipped
The nav search bar (`src/components/nav-search.tsx`) searches anime by default; a "Search people
for '...'" button below those results fetches and shows matching public users in a "People"
section, only once clicked. Replaced the dedicated `/people` search page from the Following work
above - one search box instead of two.

## Profile page unification — shipped
`/profile` and `/u/[username]` used to be two separate components (`ProfileView` and
`PublicProfileView`) that had already drifted apart once. `/profile` now redirects to
`/u/[username]` for the signed-in user, and both routes render the same `ProfilePageView`
component - the owner's editable view and everyone else's read-only view differ only by an
`isOwner` flag, so they can't drift again. The owner can also now view their own profile even
while it's set to private; everyone else still gets the same 404 as an unknown username.

## Profile customization & visual polish — shipped
- Avatar next to the username: a real uploaded picture takes priority, falling back to the Google
  account picture (if any), falling back to a generated initial-on-a-circle when neither exists
  (`src/components/avatar.tsx`)
- Multi-line bio (`Account settings`' bio field is now a textarea, rendered with preserved line
  breaks) instead of a single line
- Optional full-width banner header, sourced from the `bannerImage` of one of the owner's own
  tracked anime (no image upload/storage in this app - "Header style" toggle in Customize, banner
  picker only shows entries that actually have one)
- Up to 6 pinned favorites (also picked from the owner's own list) shown as a strip near the top
- Accent color: the curated swatches plus a native color picker for anything else
- Stats (tracked/episodes/avg score/genres) restyled as bordered stat cards instead of plain
  inline text
- `src/app/api/profile/route.ts` re-validates that a saved banner/favorite id is actually on the
  owner's own list server-side (silently dropped otherwise), not just trusting the client
- Profile picture upload (`Account settings`): resized/compressed to a small square JPEG
  client-side, then stored inline as a data URL on `User.avatarImage` - this app has no blob/file
  storage, so there's nowhere else to put it. A "Remove" option reverts to the fallback above.

## Anime page cleanup, share buttons, link previews — shipped
- The status/score/progress editor on an anime page (`AddToListControl`) was a permanently-expanded
  box of buttons; it's now a single pill (current status + score) that opens the same editor as a
  dropdown, closing on an outside click.
- Share button (native share sheet on mobile, copies the link elsewhere) on both the anime page and
  the profile page (`src/components/share-button.tsx`).
- Open Graph / Twitter Card metadata site-wide, so links posted in Discord/Twitter/iMessage embed
  with a real title, description, and image instead of a bare URL: anime pages use the anime's own
  banner/cover art and synopsis; profile pages use the owner's bio and avatar; everything else falls
  back to a generated brand image (`src/app/opengraph-image.tsx`, built with `next/og` - no static
  asset needed).

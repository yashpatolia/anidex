# Roadmap

Features scoped for later, not yet built. Ordered roughly by dependency, not priority.

## Account settings page — mostly done
`/account`: display name/bio (moved off Profile), change password, set a password for
Google-only accounts, delete account, list of linked sign-in methods — all shipped.
- Still open: actual link/unlink of Google OAuth (an unlink button is deferred until it can't
  strand a user with no way back in — revisit once every account is guaranteed to have at
  least one other verified sign-in method)

## Recommendations
- "Because you completed X" on Profile or a dedicated section
- Source data: AniList's `recommendations` connection on `Media` (peer-sourced, already exists on their API, not yet in our `MEDIA_DETAIL_FIELDS`), cross-referenced against what's already tracked (exclude those)
- Alternative/supplement: genre-overlap scoring against the user's own list using data already in `AnimeCache`, no extra AniList calls needed

## Airing calendar
- New `/airing` page: week view of upcoming episodes for anime the user is tracking as Watching
- Data source: AniList's `nextAiringEpisode` field on `Media` (not yet in our types/queries)
- Natural pairing with a notification later (flagged as a bigger bet, not in this batch)

## UI/UX polish batch
Flagged 2026-09-01, not yet scoped in detail — nothing currently open here.

Also flagged during the original roadmap discussion, not selected for this batch but worth remembering:
- Notes field on list entries (schema already supports it, `AnimeListEntry.notes`, just needs UI)
- Rewatch tracking surfaced distinctly (`REWATCHING` status exists, currently folded into "Watching")
- Studio breakdown stat on Profile (same pattern as existing genre breakdown)
- Total watch time stat (`episodes watched × cached duration`)
- Scheduled jobs for `AnimeTitle` index refresh and `AnimeCache` warming (currently manual scripts)
- Notifications (new episode airing, sequel announced)
- Social layer (following, activity feed, reviews) — bigger product decision, not just a feature

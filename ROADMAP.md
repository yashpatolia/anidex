# Roadmap

Features scoped for later, not yet built. Ordered roughly by dependency, not priority.

## Account settings page
Still open: actual link/unlink of Google OAuth (an unlink button is deferred until it can't
strand a user with no way back in — revisit once every account is guaranteed to have at
least one other verified sign-in method).

## UI/UX polish batch
Flagged 2026-09-01, not yet scoped in detail — nothing currently open here.

Also flagged during the original roadmap discussion, not selected for this batch but worth remembering:
- Notes field on list entries (schema already supports it, `AnimeListEntry.notes`, just needs UI)
- Rewatch tracking surfaced distinctly (`REWATCHING` status exists, currently folded into "Watching")
- Studio breakdown stat on Profile (same pattern as existing genre breakdown)
- Total watch time stat (`episodes watched × cached duration`)
- Scheduled jobs for `AnimeTitle` index refresh and `AnimeCache` warming (currently manual scripts)
- Sequel-announced notifications (needs separate change-detection infrastructure)
- Activity feed and reviews/comments (the rest of the social layer beyond following) — separate
  product decisions, not started

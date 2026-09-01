# Roadmap

Features scoped for later, not yet built. Ordered roughly by dependency, not priority.

## Account settings page
`/account` (or `/settings`). Needed before some of the below can ship safely.
- Change password (credentials users only)
- Link/unlink Google OAuth
- Delete account (cascades via existing `onDelete: Cascade` on `Account`/`Session`/`AnimeListEntry`)
- Display name / bio already editable via Profile's Customize panel — consider moving here instead, Profile stays list-focused

## List export
- Button on Profile or Account settings: download own `AnimeListEntry` rows as JSON and/or CSV
- Straightforward: one query scoped to `userId`, no new schema
- Do this before import (reuse the shape for import validation/testing)

## List import from MyAnimeList / AniList
- Highest-impact feature for adoption — lets someone migrate an existing list instead of starting at zero
- MAL export format: XML (`animelist.xml`), fields map roughly to our `status`/`score`/`progress`
- AniList export: JSON via their own export tool, or query their API directly given a username
- Needs: file upload UI, a parser per source format, a mapping step (MAL's 10-status scale incl. "Plan to Watch" etc. → our `WatchStatus` enum), dedup/upsert against existing entries (don't clobber what's already tracked — same non-destructive principle as quick-add), and a review step before committing (show "X entries will be added/updated" before writing)
- Anime matching: MAL and AniList use different IDs for the same anime. MAL exports include MAL IDs; need either AniList's `idMal` field (already queryable) to cross-reference, or a title-based fuzzy match against `AnimeTitle` as fallback

## Public profile pages
- Shareable read-only view of a user's list at a URL (e.g. `/u/[username]`)
- Needs: a `username` or slug field on `User` (currently no unique public-facing handle, just `id`/`email`/`name`), a privacy toggle in `profilePrefs` (default private), and a read-only variant of `ProfileView` with the Customize panel stripped
- Consider: does the accent-color/section customization carry over to the public view? (Probably yes — it's "their" page.)

## Recommendations
- "Because you completed X" on Profile or a dedicated section
- Source data: AniList's `recommendations` connection on `Media` (peer-sourced, already exists on their API, not yet in our `MEDIA_DETAIL_FIELDS`), cross-referenced against what's already tracked (exclude those)
- Alternative/supplement: genre-overlap scoring against the user's own list using data already in `AnimeCache`, no extra AniList calls needed

## Airing calendar
- New `/airing` page: week view of upcoming episodes for anime the user is tracking as Watching
- Data source: AniList's `nextAiringEpisode` field on `Media` (not yet in our types/queries)
- Natural pairing with a notification later (flagged as a bigger bet, not in this batch)

---

Also flagged during the original roadmap discussion, not selected for this batch but worth remembering:
- Notes field on list entries (schema already supports it, `AnimeListEntry.notes`, just needs UI)
- Rewatch tracking surfaced distinctly (`REWATCHING` status exists, currently folded into "Watching")
- Studio breakdown stat on Profile (same pattern as existing genre breakdown)
- Total watch time stat (`episodes watched × cached duration`)
- Scheduled jobs for `AnimeTitle` index refresh and `AnimeCache` warming (currently manual scripts)
- Notifications (new episode airing, sequel announced)
- Social layer (following, activity feed, reviews) — bigger product decision, not just a feature

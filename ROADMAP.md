# Roadmap

Features scoped for later, not yet built. Ordered roughly by dependency, not priority.

## ~~URGENT — prod is hitting AniList's rate limit~~ — fixed 2026-09-01
Diagnosed from prod logs (`docker compose logs app` on the VPS): repeated `Error: Too
Many Requests` (429) from AniList, bad enough that switching between a few pages
exhausted the limit and tripped the app's error boundary for real users.

Root cause: `anilistFetch()` set `next: { revalidate: 3600 }`, but AniList's API requires
POST and Next's automatic fetch Data Cache reliably auto-caches GET only — that option was
a silent no-op, so Browse/Seasonal/Trending/Popular/Top-rated (not covered by the
`AnimeCache` DB table, unlike per-id lookups) hit AniList completely fresh on every page
load. Fixed by wrapping the AniList call in `unstable_cache` from `next/cache` instead,
which caches by arguments server-side regardless of HTTP method. Verified live: an
identical Browse query issued twice only hit AniList once (confirmed via temporary
logging, second request ~4x faster and produced no new upstream call). Also added 429
retry-with-backoff (respects `Retry-After`) as a resilience layer on top.
Also worth checking once this lands: whether it's actually necessary to keep
Browse/Seasonal/Trending out of the `AnimeCache` DB table too, or whether `unstable_cache`
alone is sufficient (simpler, one caching mechanism instead of two).

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

## UI/UX polish batch
Flagged 2026-09-01, not yet scoped in detail:
- ~~List entry editor: selecting "Completed" should auto-max progress to the anime's episode count~~ — done (Plan to watch also auto-resets progress to 0)
- ~~List entry editor: add a way to type an exact episode count directly, not just increment/decrement~~ — done
- ~~Landing page trending rail: add manual back/forward dots (like a carousel), and move/center the "Trending" label below the rail's title instead of its current position~~ — done, rebuilt as a turntable carousel (active cover centered/enlarged, neighbors peeking smaller/dimmer, arrows + dots, animated)
- ~~Anime detail page: the format/episode-count/status/year/score line (e.g. "TV · 12 episodes · Airing · 2026 · 8/10") should use the same middle-dot separators as the genre line ("Drama · Romance"), not whatever separator is there now~~ — done
- Auth: real email/password registration + login (today's Credentials provider is dev-seed-only, gated out of production — see `src/lib/auth.ts`)
- Auth/Profile: let a user choose a username (also a prerequisite noted under Public profile pages above, for a `/u/[username]` URL)
- ~~Nav: bigger click targets on Browse/Seasonal/Profile links~~ — done
- ~~Nav: move Profile to the right side of the nav bar~~ — done

Also flagged during the original roadmap discussion, not selected for this batch but worth remembering:
- Notes field on list entries (schema already supports it, `AnimeListEntry.notes`, just needs UI)
- Rewatch tracking surfaced distinctly (`REWATCHING` status exists, currently folded into "Watching")
- Studio breakdown stat on Profile (same pattern as existing genre breakdown)
- Total watch time stat (`episodes watched × cached duration`)
- Scheduled jobs for `AnimeTitle` index refresh and `AnimeCache` warming (currently manual scripts)
- Notifications (new episode airing, sequel announced)
- Social layer (following, activity feed, reviews) — bigger product decision, not just a feature

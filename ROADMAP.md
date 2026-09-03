# Roadmap

Features scoped for later, not yet built. Ordered roughly by dependency, not priority.

## UI/UX polish batch
Flagged 2026-09-01, not yet scoped in detail — nothing currently open here.

Also flagged during the original roadmap discussion, not selected for this batch but worth remembering:
- Notes field on list entries (AniList's own MediaList type already has `notes`; needs a UI plus wiring it through anilist-sync.ts's mutation)
- Rewatch tracking surfaced distinctly (`REWATCHING` status exists, currently folded into "Watching")
- Studio breakdown stat on Profile (same pattern as existing genre breakdown)
- Total watch time stat (`episodes watched × AniList's per-episode duration`)
- Sequel-announced notifications (needs separate change-detection infrastructure)
- Activity feed and reviews/comments (the rest of the social layer beyond following) — separate
  product decisions, not started

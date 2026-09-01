# Scalability

Notes on whether the current architecture holds up as user count grows, and where it
actually breaks. Written 2026-09-01 in response to: "if there were 10,000 users for my
site, wouldn't this cause an API rate limit issue, is building my own DB not a good idea."

## Short answer

No — not because of user *count*. The `AnimeCache` table already decouples user traffic
from AniList traffic for the common case (browsing shared/popular content). "Building your
own DB" is the right instinct and already buys most of what's needed. The real risk is
narrower than "more users = more API calls."

## Why user count mostly doesn't multiply AniList load

`AnimeCache` is keyed by `anilistId`, not by user. When one user loads the trending rail,
that entry gets cached; the next 9,999 users loading the *same* trending/popular/seasonal
pages hit Postgres, not AniList, until the 6h TTL expires. Concurrent users looking at the
same popular content multiplies cache reads (cheap), not AniList calls (rate-limited).

## What actually does scale with user count

1. **Long-tail variety.** More users → more distinct obscure titles get looked at → more
   first-time cache misses in aggregate. Scales with *diversity of content browsed*, not
   raw user count, but it's real.
2. **Uncached write-path AniList calls.** MAL import matching (`idMal_in` lookups) happens
   per-import, live, and is **not** covered by `AnimeCache`. 10,000 users each running an
   import on the same day is a genuine burst regardless of read-side caching.
3. **Shared rate budget.** AniList's limit (currently degraded to 30 req/min per their own
   docs) is a budget for the whole app, not per-user. A handful of concurrent cold imports
   could saturate it well before read traffic does.

## Priority list if scale becomes a real concern

- Cache or throttle/queue the MAL import-matching path — this is the one AniList-cost path
  today that bypasses `AnimeCache` entirely, and the most likely actual bottleneck.
- Consider stale-while-revalidate for `AnimeCache` so a burst of simultaneous first-time
  misses (e.g. a new season dropping) doesn't fire a synchronous herd of AniList calls.
- `AnimeTitle`'s 5,000-popularity-cap search index is a separate concern (search coverage,
  not rate limiting) — revisit only if search quality complaints show up, not scaling per se.

## Not a concern today

At current traffic, none of the above is urgent. This doc exists so the reasoning isn't
re-derived from scratch next time the question comes up.

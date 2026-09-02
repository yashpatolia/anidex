# anime-list

A minimalist, self-hosted MyAnimeList-style tracker. Anime metadata (search, titles,
cover art) is read live from the [AniList GraphQL API](https://docs.anilist.co/); your
own list state (status/score/progress) lives in a Postgres database you own. Live at
[anidex.ca](https://anidex.ca).

## Features

- **List tracking** — status (Watching/Rewatching/Completed/Plan to Watch/On Hold/Dropped),
  score, episode progress, grid/list/compact views, sort/search/filter.
- **Browse & Seasonal** — trending/popular/seasonal anime, real substring search backed by a
  local title index (AniList's own search API returns nothing for short fragments).
- **Import & Export** — import an existing list from AniList or MyAnimeList (by username or
  export file); export your own list back out as JSON or CSV any time.
- **Public profiles** (`/u/[username]`) — opt-in, private by default. Customizable: accent
  color, an optional full-width banner sourced from one of your own tracked anime, up to 6
  pinned favorites, section visibility/order (drag-and-drop), which stats show.
- **Following** — follow/unfollow other public profiles, dedicated followers/following pages,
  find people via the nav search bar.
- **Notifications** — a bell with a persistent, read/unread inbox; generated lazily against
  AniList's airing data when you open it, for any episode aired since you last logged progress.
- **Airing calendar** — a horizontal Monday–Sunday view of popular currently-airing anime.
- **Recommendations** — genre-pair co-occurrence over your own watch history (score-weighted,
  Dropped as a negative signal), as a page and a row on the home page.
- **Account settings** — username, multi-line bio, profile picture (uploaded or a generated
  fallback), password (set one even if you signed up with Google), linked sign-in methods,
  delete account.
- **Auth** — Google OAuth and email/password, and you can add a password to a Google-only
  account (or vice versa) so either always gets you into the same account.
- **Link previews** — Open Graph/Twitter Card metadata everywhere (anime pages use the anime's
  own art, profiles use the owner's avatar/bio, everything else falls back to a generated brand
  image), plus `robots.txt` + `sitemap.xml` for search engines.

## Stack

- Next.js (App Router) + Tailwind
- Prisma 7 + Postgres (via `@prisma/adapter-pg`)
- Auth.js (NextAuth v5): Google OAuth + email/password credentials
- Docker + GitHub Actions → deploys to a VPS via `docker compose`

## Local development

1. Copy `.env.example` to `.env` and adjust `DATABASE_URL` if needed.
2. Make sure Postgres is running locally and the `anime_list` DB/role exist
   (see below if not).
3. Install deps and run migrations:

   ```bash
   npm install
   npx prisma migrate dev
   npx prisma db seed
   npm run dev
   ```

4. Open [http://localhost:3000/login](http://localhost:3000/login) and sign in with the
   seeded dev account: `dev@example.com` / `devpassword`.

### Creating the local Postgres role/DB (one-time)

```bash
createuser anime_list
psql -U postgres -c "ALTER USER anime_list WITH PASSWORD 'anime_list_dev_pw' CREATEDB;"
createdb -O anime_list anime_list
```

### Useful Prisma commands

```bash
npx prisma studio         # browse the DB in a GUI
npx prisma migrate dev    # create + apply a migration from schema changes
npx prisma db seed        # re-run prisma/seed.ts
```

## Deployment (VPS via GitHub Actions)

On push to `master`, `.github/workflows/deploy.yml`:

1. Builds the `Dockerfile` and pushes it to GHCR (`ghcr.io/<owner>/anime-list`).
2. SSHes into the VPS and runs `docker compose pull && up -d`, which also runs
   `prisma migrate deploy` automatically on container start (see `docker-entrypoint.sh`).

### One-time: seed the local anime title search index

Browse's search and the nav search dropdown use a local mirror of AniList's title
catalog for real substring matching (AniList's own search API returns nothing for
short fragments). After the first deploy, run this once against the production
database to populate it:

```bash
DATABASE_URL=<production DATABASE_URL> npx tsx scripts/sync-anime-titles.ts
```

Takes a few minutes (rate-limit-paced, ~5,000 titles). Safe to re-run any time to
refresh popularity/titles — it upserts, not replaces.

### One-time VPS setup

1. Install Docker + the Compose plugin on the VPS.
2. Copy `docker-compose.yml` to a directory on the VPS (e.g. `/opt/anime-list`).
3. Copy `.env.production.example` to `.env` in that same directory and fill in real
   values (DB password, `NEXTAUTH_SECRET`, Google OAuth creds, domain, `MAL_CLIENT_ID`
   — register a Non-Commercial app at https://myanimelist.net/apiconfig to get one;
   powers the "import by MAL username" option, not required for anything else to work).
4. `docker compose up -d` once manually to confirm it starts.

### Required GitHub repo secrets

| Secret | Value |
|---|---|
| `VPS_HOST` | VPS IP or hostname |
| `VPS_USER` | SSH user |
| `VPS_SSH_KEY` | Private key with access to that user |
| `VPS_APP_DIR` | Path on the VPS containing `docker-compose.yml` + `.env` (e.g. `/opt/anime-list`) |

`GITHUB_TOKEN` is provided automatically by Actions and used both to push to GHCR and
to let the VPS pull the (private) image.

## Search engine visibility

`NEXTAUTH_URL` doubles as the canonical site URL for `metadataBase`, Open Graph/Twitter
metadata, and the `robots.txt`/`sitemap.xml` routes (`src/app/robots.ts`,
`src/app/sitemap.ts`) — make sure it's set to the real `https://` domain in production,
not a placeholder, or those all silently point at the wrong URL.

To get indexed by Google:

1. Add the domain in [Google Search Console](https://search.google.com/search-console)
   as a **Domain** property (not "URL prefix") and verify via the DNS TXT record it gives
   you.
2. Submit `sitemap.xml` under Sitemaps in Search Console.
3. Optionally use URL Inspection → Request Indexing on the homepage for a faster first
   crawl.

The sitemap deliberately lists only the site's own static pages (home, browse, seasonal,
airing, login, register) — not every `/anime/[id]` or `/u/[username]` page. Those stay
fully crawlable (`robots.txt` allows them) and get found organically through internal
links; a brand-new domain's limited initial crawl budget is better spent on what's
actually distinctive about the site than thousands of pages that are largely a mirror of
AniList's own metadata.

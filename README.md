# anime-list

A minimalist, self-hosted MyAnimeList-style tracker. Anime metadata (search, titles,
cover art) is read live from the [AniList GraphQL API](https://docs.anilist.co/); your
own list state (status/score/progress) lives in a Postgres database you own.

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
   values (DB password, `NEXTAUTH_SECRET`, Google OAuth creds, domain).
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

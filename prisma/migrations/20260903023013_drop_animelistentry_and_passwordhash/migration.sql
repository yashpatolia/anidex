-- Drop AnimeListEntry: AniList is the only place list data lives now, this
-- table's own read/write paths have all been removed from the app.
ALTER TABLE "AnimeListEntry" DROP CONSTRAINT IF EXISTS "AnimeListEntry_userId_fkey";
DROP TABLE IF EXISTS "AnimeListEntry";
DROP TYPE IF EXISTS "WatchStatus";

-- Drop User.passwordHash: dead since the Credentials provider was removed
-- (AniList-only sign-in).
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";

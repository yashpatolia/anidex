-- DropIndex
DROP INDEX "AnimeCache_malId_key";

-- DropIndex
DROP INDEX "AnimeTitle_malId_key";

-- CreateIndex
CREATE INDEX "AnimeCache_malId_idx" ON "AnimeCache"("malId");

-- CreateIndex
CREATE INDEX "AnimeTitle_malId_idx" ON "AnimeTitle"("malId");

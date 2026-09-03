-- AlterTable
ALTER TABLE "AnimeCache" ADD COLUMN     "malId" INTEGER;

-- AlterTable
ALTER TABLE "AnimeTitle" ADD COLUMN     "malId" INTEGER;

-- AlterTable
ALTER TABLE "AnimeListEntry" ADD COLUMN     "malId" INTEGER;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "malId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "AnimeCache_malId_key" ON "AnimeCache"("malId");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeTitle_malId_key" ON "AnimeTitle"("malId");

-- CreateIndex
CREATE INDEX "AnimeListEntry_malId_idx" ON "AnimeListEntry"("malId");

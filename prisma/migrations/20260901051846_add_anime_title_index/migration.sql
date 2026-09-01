-- CreateTable
CREATE TABLE "AnimeTitle" (
    "anilistId" INTEGER NOT NULL,
    "romaji" TEXT,
    "english" TEXT,
    "native" TEXT,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimeTitle_pkey" PRIMARY KEY ("anilistId")
);

-- CreateIndex
CREATE INDEX "AnimeTitle_romaji_idx" ON "AnimeTitle"("romaji");

-- CreateIndex
CREATE INDEX "AnimeTitle_english_idx" ON "AnimeTitle"("english");

-- CreateTable
CREATE TABLE "AnimeCache" (
    "anilistId" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimeCache_pkey" PRIMARY KEY ("anilistId")
);

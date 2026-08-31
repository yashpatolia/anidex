import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, WatchStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Real AniList IDs so detail pages resolve to actual anime during dev.
const SAMPLE_ENTRIES: {
  anilistId: number;
  status: WatchStatus;
  score: number | null;
  progress: number;
}[] = [
  { anilistId: 5114, status: WatchStatus.COMPLETED, score: 10, progress: 64 }, // FMA: Brotherhood
  { anilistId: 16498, status: WatchStatus.COMPLETED, score: 9, progress: 25 }, // Attack on Titan
  { anilistId: 9253, status: WatchStatus.COMPLETED, score: 9, progress: 24 }, // Steins;Gate
  { anilistId: 1, status: WatchStatus.COMPLETED, score: 8, progress: 26 }, // Cowboy Bebop
  { anilistId: 154587, status: WatchStatus.WATCHING, score: null, progress: 8 }, // Frieren
  { anilistId: 21, status: WatchStatus.WATCHING, score: null, progress: 400 }, // One Piece
  { anilistId: 101922, status: WatchStatus.PLANNED, score: null, progress: 0 }, // Demon Slayer
  { anilistId: 20958, status: WatchStatus.DROPPED, score: 5, progress: 3 }, // Attack on Titan S2 (example drop)
];

async function main() {
  const email = process.env.DEV_LOGIN_EMAIL ?? "dev@example.com";
  const password = process.env.DEV_LOGIN_PASSWORD ?? "devpassword";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      name: "Dev User",
      passwordHash,
    },
  });

  for (const entry of SAMPLE_ENTRIES) {
    await prisma.animeListEntry.upsert({
      where: { userId_anilistId: { userId: user.id, anilistId: entry.anilistId } },
      update: entry,
      create: { ...entry, userId: user.id },
    });
  }

  console.log(`Seeded dev user: ${email} / ${password}`);
  console.log(`Seeded ${SAMPLE_ENTRIES.length} list entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

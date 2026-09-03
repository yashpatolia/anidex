import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Nothing left to seed a list with — AniList is the only place list data
// lives now (see anilist-client.ts's file comment), and sign-in is
// AniList-only (see auth.ts), so there's no local Credentials dev user or
// AnimeListEntry table to fake here either. This just makes sure a fresh
// dev database has no leftover expectations from either of those.
async function main() {
  console.log("Nothing to seed — AniList is the only source of both accounts and list data now.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

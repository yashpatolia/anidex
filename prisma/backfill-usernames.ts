import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateUniqueUsername } from "../src/lib/username";

// One-off backfill for the username column added in the add_username
// migration. Every account that predates that migration has username: null;
// this assigns each one a generated-but-unique handle derived from their
// email (falling back to their display name) so the column can be treated
// as always-present everywhere else in the app. Safe to run multiple times
// — only touches rows where username is still null.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    where: { username: null },
    select: { id: true, email: true, name: true },
  });

  for (const user of users) {
    const seed = user.email?.split("@")[0] ?? user.name ?? "user";
    const username = await generateUniqueUsername(prisma, seed);
    await prisma.user.update({
      where: { id: user.id },
      data: { username, usernameAutoAssigned: true },
    });
    console.log(`${user.email ?? user.id} -> ${username}`);
  }

  console.log(`Backfilled ${users.length} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

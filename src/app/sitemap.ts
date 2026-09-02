import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { normalizePrefs } from "@/lib/profile-prefs";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Queries the DB, so this can't be statically prerendered at build time —
// the Docker build stage has no database connection at all (that only
// exists at runtime via docker-compose), which made `npm run build` in CI
// fail outright trying to prerender this route. Forces it to render per
// request instead, same as any other page that reads from Prisma.
export const dynamic = "force-dynamic";

// Next's file-convention sitemap — served at /sitemap.xml, listed in
// robots.ts. Deliberately does NOT list every /anime/[id] page: that
// content is largely a mirror of AniList's own synopsis/metadata, the same
// as dozens of other tracker sites — on a brand-new domain with no
// authority yet, spending the sitemap (and Google's limited initial crawl
// budget) on thousands of near-duplicate pages would come at the expense
// of what's actually distinctive here. Anime pages are still fully
// crawlable (robots.txt allows them) and get found organically via
// internal links from Browse/Seasonal; this just doesn't spoon-feed them.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const users = await prisma.user.findMany({
    where: { username: { not: null } },
    select: { username: true, updatedAt: true, profilePrefs: true },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/browse`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/seasonal`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/airing`, changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/login`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/register`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Only accounts that have actually opted their list into being public —
  // same rule enforced (for viewing, not just listing) by
  // src/lib/profile-access.ts.
  const profileRoutes: MetadataRoute.Sitemap = users
    .filter((u) => normalizePrefs(u.profilePrefs).isPublic)
    .map((u) => ({
      url: `${baseUrl}/u/${u.username}`,
      lastModified: u.updatedAt,
      changeFrequency: "weekly",
      priority: 0.4,
    }));

  return [...staticRoutes, ...profileRoutes];
}

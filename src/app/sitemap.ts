import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { normalizePrefs } from "@/lib/profile-prefs";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Next's file-convention sitemap — served at /sitemap.xml, listed in
// robots.ts. Capped at AniList's title index rather than every id AniList
// has ever assigned: only anime this app actually knows about (has been
// searched/browsed at least once — see scripts/sync-anime-titles.ts) has a
// page worth indexing here, same anime-cache-is-lazy principle as the rest
// of the app.
const MAX_ANIME_URLS = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [titles, users] = await Promise.all([
    prisma.animeTitle.findMany({
      select: { anilistId: true, updatedAt: true },
      orderBy: { popularity: "desc" },
      take: MAX_ANIME_URLS,
    }),
    prisma.user.findMany({
      where: { username: { not: null } },
      select: { username: true, updatedAt: true, profilePrefs: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/browse`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/seasonal`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/airing`, changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/login`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/register`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const animeRoutes: MetadataRoute.Sitemap = titles.map((t) => ({
    url: `${baseUrl}/anime/${t.anilistId}`,
    lastModified: t.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

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

  return [...staticRoutes, ...animeRoutes, ...profileRoutes];
}

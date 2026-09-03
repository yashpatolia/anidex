import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Static output would otherwise get prerendered once at Docker build time,
// when NEXTAUTH_URL isn't set yet (only exists at runtime via
// docker-compose's env file) — baking in the `http://localhost:3000`
// fallback permanently, the same bug this fixed once already in
// robots.ts. No DB query here anymore, but this still needs to run in the
// container to see the real env var.
export const dynamic = "force-dynamic";

// Next's file-convention sitemap — served at /sitemap.xml, listed in
// robots.ts. Deliberately just the site's own static pages, not every
// /anime/[id] or /u/[username] page: anime pages are largely a mirror of
// AniList's own synopsis/metadata, the same as dozens of other tracker
// sites, and profile pages are individual users' content rather than the
// site's own. On a brand-new domain with no authority yet, spending the
// sitemap (and Google's limited initial crawl budget) on either would come
// at the expense of what's actually distinctive here. Both stay fully
// crawlable (robots.txt allows them) and get found organically via
// internal links; this just doesn't spoon-feed them upfront.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/browse`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/seasonal`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/airing`, changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/login`, changeFrequency: "yearly", priority: 0.2 },
  ];
}

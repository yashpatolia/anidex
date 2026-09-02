import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Next's file-convention robots.txt — served at /robots.txt. Keeps
// authenticated-only sections (account settings, the API) out of the
// crawl; everything else here is meant to be found (browse, anime pages,
// public profiles).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Static output (no request-time data) would otherwise get prerendered
// once at Docker build time, when NEXTAUTH_URL isn't set yet (that only
// exists at runtime via docker-compose's env file) — baking in the
// `http://localhost:3000` fallback permanently. Forcing dynamic makes
// this evaluate per-request in the running container instead, same fix
// as sitemap.ts (which had to be dynamic anyway, since it queries the DB).
export const dynamic = "force-dynamic";

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

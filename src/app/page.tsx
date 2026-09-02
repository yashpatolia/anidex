import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

// Next.js has a known bug where the root layout's title template doesn't
// apply to the direct root page.tsx (only to nested routes) —
// https://github.com/vercel/next.js/issues/60666. Spelling the full title
// out here sidesteps it rather than waiting on a template that won't fire.
export const metadata: Metadata = {
  title: "AniDex - Home",
};

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Basic WebSite structured data — lets Google understand the site's
// identity (name distinct from the page title, canonical URL) and is a
// prerequisite if a sitelinks search box is ever going to show up in
// search results. The SearchAction points at /browse's existing ?search=
// query param, no new route needed for it.
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "AniDex",
  url: baseUrl,
  description: "A record of everything you've watched.",
  potentialAction: {
    "@type": "SearchAction",
    target: `${baseUrl}/browse?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function Home() {
  return (
    <>
      {/* Static, hand-authored JSON — no user input reaches this. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <LandingPage />
    </>
  );
}

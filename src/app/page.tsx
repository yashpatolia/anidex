import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

// Next.js has a known bug where the root layout's title template doesn't
// apply to the direct root page.tsx (only to nested routes) —
// https://github.com/vercel/next.js/issues/60666. Spelling the full title
// out here sidesteps it rather than waiting on a template that won't fire.
export const metadata: Metadata = {
  title: "AniDex - Home",
};

export default function Home() {
  return <LandingPage />;
}

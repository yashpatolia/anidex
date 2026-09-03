import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { RecommendationsView } from "@/components/recommendations-view";

export const metadata: Metadata = {
  title: "Recommendations",
};

// Auth check only — no AniList data fetched server-side anymore (see
// recommendations-client.ts's file comment).
export default async function RecommendationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <RecommendationsView />;
}

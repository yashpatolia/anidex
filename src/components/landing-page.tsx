import { auth } from "@/lib/auth";
import { LandingRails } from "@/components/landing-rails";

// Server component only to read the session (our own data) — everything
// else, including the rest of the page body, is client-fetched now; see
// landing-rails.tsx's file comment for why it owns the whole layout.
export async function LandingPage() {
  const session = await auth();
  return <LandingRails signedIn={!!session?.user} />;
}

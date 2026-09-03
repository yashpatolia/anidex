import type { Metadata } from "next";
import { AiringView } from "@/components/airing-view";

export const metadata: Metadata = {
  title: "Airing",
};

// No server-side AniList fetching anymore — see airing-view.tsx.
export default function AiringPage() {
  return (
    <main className="flex w-full flex-col gap-8 px-8 py-12 2xl:px-16">
      <header className="flex flex-col gap-2 border-b border-line pb-8">
        <h1 className="font-display text-3xl text-paper">Airing this week</h1>
        <p className="text-sm text-ash">Popular anime airing over the next 7 days.</p>
      </header>

      <AiringView />
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import type { AnilistMedia } from "@/lib/anilist-client";
import type { WatchStatus } from "@/lib/anilist-shared";
import { QuickAddButton } from "@/components/quick-add-button";

export function AnimeCard({
  anime,
  initialTracked = false,
  initialStatus = null,
  score,
  dense = false,
  isAdult = false,
  onStatusChange,
}: {
  anime: AnilistMedia;
  initialTracked?: boolean;
  // The viewer's real list status for this entry, when known (Browse,
  // Seasonal, Landing) — lets the overlay badge read "Watching"/"Completed"
  // instead of just a generic checkmark. Callers that only know a plain
  // tracked/untracked boolean (Profile viewing someone else's list) can
  // keep passing initialTracked instead; leave initialStatus unset and the
  // badge falls back to a checkmark.
  initialStatus?: WatchStatus | null;
  // The viewer's own score for this entry (1-10), not AniList's average —
  // shown as a stamped badge over the cover when present (Profile only;
  // Browse/Seasonal/Landing never pass this).
  score?: number | null;
  // Compact grid mode: drops the genre line so more cards fit per row
  // without the text crowding the smaller covers.
  dense?: boolean;
  // Browse/Seasonal/Landing already filter isAdult: false at the query
  // level, so this never applies there. Airing doesn't filter it out (a
  // popularity-ranked "what's airing" list shouldn't silently drop
  // entries) — it tags them instead.
  isAdult?: boolean;
  // Fires whenever the card's own status editor changes what's tracked —
  // lets a parent that filters by tracked status (Recommendations, the
  // landing page's "Recommended" row) drop this card immediately instead
  // of waiting for its next full data fetch.
  onStatusChange?: (status: WatchStatus | null) => void;
}) {
  const title = anime.title.english ?? anime.title.romaji ?? anime.title.native ?? "Untitled";

  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group relative flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-hanko"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-line">
        {anime.coverImage.large && (
          <Image
            src={anime.coverImage.large}
            alt={title}
            fill
            sizes="(min-width: 1024px) 180px, 45vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        )}

        <QuickAddButton
          anilistId={anime.id}
          initialTracked={initialTracked}
          initialStatus={initialStatus}
          onStatusChange={onStatusChange}
        />

        {score != null && (
          <span className="absolute right-2 top-2 flex h-7 items-center border-2 border-hanko bg-ink/90 px-2 font-mono text-xs font-semibold text-hanko">
            {score}/10
          </span>
        )}

        {isAdult && (
          <span className="absolute bottom-2 right-2 flex h-5 items-center bg-ink/90 px-1.5 font-mono text-[10px] font-semibold text-ash">
            18+
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-line pt-2">
        <h3 className="font-display text-[15px] leading-snug text-paper line-clamp-2">
          {title}
        </h3>

        {!dense && anime.genres.length > 0 && (
          <p className="font-mono text-[11px] uppercase tracking-wide text-ash">
            {anime.genres.slice(0, 3).join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}

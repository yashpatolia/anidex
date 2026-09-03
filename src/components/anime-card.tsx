import Image from "next/image";
import Link from "next/link";
import type { AnilistMedia } from "@/lib/anilist-client";
import { QuickAddButton } from "@/components/quick-add-button";

export function AnimeCard({
  anime,
  initialTracked = false,
  score,
  dense = false,
  isAdult = false,
}: {
  anime: AnilistMedia;
  initialTracked?: boolean;
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

        <QuickAddButton anilistId={anime.id} initialTracked={initialTracked} />

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

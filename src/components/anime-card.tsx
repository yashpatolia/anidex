import Image from "next/image";
import Link from "next/link";
import type { AnilistMedia } from "@/lib/anilist";
import { QuickAddButton } from "@/components/quick-add-button";

export function AnimeCard({
  anime,
  initialTracked = false,
}: {
  anime: AnilistMedia;
  initialTracked?: boolean;
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
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-line pt-2">
        <h3 className="font-display text-[15px] leading-snug text-paper line-clamp-2">
          {title}
        </h3>

        {anime.genres.length > 0 && (
          <p className="font-mono text-[11px] uppercase tracking-wide text-ash">
            {anime.genres.slice(0, 3).join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}

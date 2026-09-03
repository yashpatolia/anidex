import Image from "next/image";
import Link from "next/link";
import type { AnilistMedia } from "@/lib/anilist-client";

// Row layout for Profile's "List" view mode: one line per entry instead of
// a card grid, trading cover size for scanability across a big list.
export function AnimeListRow({
  anime,
  score,
  progress,
}: {
  anime: AnilistMedia;
  score: number | null;
  progress: number;
}) {
  const title = anime.title.english ?? anime.title.romaji ?? anime.title.native ?? "Untitled";

  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group flex items-center gap-4 border-b border-line py-2.5 pr-2 last:border-b-0 hover:bg-line/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-hanko"
    >
      <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden bg-line">
        {anime.coverImage.large && (
          <Image src={anime.coverImage.large} alt="" fill sizes="40px" className="object-cover" />
        )}
      </div>

      <h3 className="min-w-0 flex-1 truncate font-display text-[15px] text-paper">{title}</h3>

      {anime.genres.length > 0 && (
        <p className="hidden max-w-[220px] truncate font-mono text-[11px] uppercase tracking-wide text-ash sm:block">
          {anime.genres.slice(0, 3).join(" · ")}
        </p>
      )}

      <span className="flex-shrink-0 font-mono text-[11px] text-ash">ep {progress}</span>

      <span
        className={`flex-shrink-0 border px-2 py-1 text-right font-mono text-xs font-semibold ${
          score != null ? "border-hanko text-hanko" : "border-line text-ash"
        }`}
      >
        {score != null ? `${score}/10` : "-/10"}
      </span>
    </Link>
  );
}

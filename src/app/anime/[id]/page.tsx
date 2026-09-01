import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedAnimeById } from "@/lib/anime-cache";
import { AddToListControl } from "@/components/add-to-list-control";
import { ScrollRail } from "@/components/scroll-rail";

function plainSynopsis(html: string | null): string {
  if (!html) return "";
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
}

const FORMAT_LABELS: Record<string, string> = {
  TV: "TV",
  TV_SHORT: "TV Short",
  MOVIE: "Movie",
  SPECIAL: "Special",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Music",
};

const STATUS_LABELS: Record<string, string> = {
  RELEASING: "Airing",
  FINISHED: "Finished",
  NOT_YET_RELEASED: "Upcoming",
  CANCELLED: "Cancelled",
  HIATUS: "Hiatus",
};

const RELATION_LABELS: Record<string, string> = {
  PREQUEL: "Prequel",
  SEQUEL: "Sequel",
  SIDE_STORY: "Side story",
  ALTERNATIVE: "Alternative",
  SUMMARY: "Summary",
  PARENT: "Parent story",
  SPIN_OFF: "Spin-off",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const anilistId = Number(id);
  if (!Number.isInteger(anilistId)) return {};

  const anime = await getCachedAnimeById(anilistId);
  if (!anime) return {};

  const title = anime.title.english ?? anime.title.romaji ?? anime.title.native ?? "Untitled";
  return { title };
}

export default async function AnimeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anilistId = Number(id);
  if (!Number.isInteger(anilistId)) notFound();

  const [session, anime] = await Promise.all([auth(), getCachedAnimeById(anilistId)]);
  if (!anime) notFound();

  const entry = session?.user
    ? await prisma.animeListEntry.findUnique({
        where: { userId_anilistId: { userId: session.user.id, anilistId } },
      })
    : null;

  const title = anime.title.english ?? anime.title.romaji ?? anime.title.native ?? "Untitled";
  const synopsis = plainSynopsis(anime.description);
  const score = anime.averageScore != null ? Math.round(anime.averageScore / 10) : null;
  const studio = anime.studios.nodes[0]?.name ?? null;
  const relatedAnime = anime.relations.edges.filter((e) => e.node.type === "ANIME").slice(0, 8);
  const cast = anime.characters.edges;

  return (
    <main className="flex w-full flex-col">
      {anime.bannerImage && (
        <div className="relative h-64 w-full overflow-hidden lg:h-80">
          <Image src={anime.bannerImage} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
        </div>
      )}

      <div className={`relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10 px-8 py-10 2xl:px-16 ${anime.bannerImage ? "-mt-16 lg:-mt-20" : ""}`}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {anime.coverImage.extraLarge && (
            <div className="relative aspect-[2/3] w-40 flex-shrink-0 shadow-[0_20px_60px_rgba(0,0,0,0.55)] lg:w-56">
              <Image
                src={anime.coverImage.extraLarge}
                alt={title}
                fill
                sizes="224px"
                className="object-cover"
              />
            </div>
          )}

          <div className="flex flex-1 flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h1
                className="font-display text-3xl text-paper lg:text-4xl"
                style={anime.bannerImage ? { textShadow: "0 2px 16px rgba(0,0,0,0.85)" } : undefined}
              >
                {title}
              </h1>
              {anime.title.native && anime.title.native !== title && (
                <p className="text-sm text-ash">{anime.title.native}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-widest text-ash">
              {anime.format && <span>{FORMAT_LABELS[anime.format] ?? anime.format}</span>}
              {anime.episodes && <span>{anime.episodes} episodes</span>}
              {anime.status && <span>{STATUS_LABELS[anime.status] ?? anime.status}</span>}
              {anime.seasonYear && <span>{anime.seasonYear}</span>}
              {studio && <span>{studio}</span>}
              {score != null && <span className="text-hanko">{score}/10</span>}
            </div>

            {anime.genres.length > 0 && (
              <p className="font-mono text-xs uppercase tracking-wide text-ash">
                {anime.genres.join(" · ")}
              </p>
            )}

            {session?.user ? (
              <AddToListControl
                anilistId={anime.id}
                episodes={anime.episodes}
                initialEntry={entry ? { status: entry.status, score: entry.score, progress: entry.progress } : null}
              />
            ) : (
              <Link
                href="/login"
                className="self-start border border-hanko bg-hanko px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-paper transition-opacity hover:opacity-85"
              >
                Log in to track this
              </Link>
            )}

            {synopsis && (
              <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-ash">{synopsis}</p>
            )}
          </div>
        </div>

        {cast.length > 0 && (
          <section className="flex flex-col gap-4 border-t border-line pt-8">
            <h2 className="font-mono text-xs uppercase tracking-widest text-ash">Cast</h2>
            <ScrollRail>
              {cast.map(({ node: character, voiceActors }) => {
                const va = voiceActors[0];
                return (
                  <div key={character.id} className="flex w-32 flex-shrink-0 flex-col gap-2">
                    <div className="relative aspect-square w-full overflow-hidden bg-line">
                      {(va?.image.large ?? character.image.large) && (
                        <Image
                          src={(va?.image.large ?? character.image.large)!}
                          alt={va?.name.full ?? character.name.full ?? ""}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <p className="font-body text-xs leading-snug text-paper line-clamp-2">
                      {va?.name.full ?? character.name.full}
                    </p>
                    {va && (
                      <div className="flex items-center gap-1.5">
                        {character.image.large && (
                          <span className="relative h-5 w-5 flex-shrink-0 overflow-hidden rounded-full bg-line">
                            <Image src={character.image.large} alt="" fill sizes="20px" className="object-cover" />
                          </span>
                        )}
                        <p className="font-mono text-[10px] leading-snug text-ash line-clamp-1">
                          {character.name.full}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </ScrollRail>
          </section>
        )}

        {relatedAnime.length > 0 && (
          <section className="flex flex-col gap-4 border-t border-line pt-8">
            <h2 className="font-mono text-xs uppercase tracking-widest text-ash">Related</h2>
            <ScrollRail>
              {relatedAnime.map(({ relationType, node }) => {
                const relTitle = node.title.english ?? node.title.romaji ?? "Untitled";
                return (
                  <Link
                    key={node.id}
                    href={`/anime/${node.id}`}
                    className="group flex w-32 flex-shrink-0 flex-col gap-2"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-line">
                      {node.coverImage.large && (
                        <Image
                          src={node.coverImage.large}
                          alt={relTitle}
                          fill
                          sizes="128px"
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        />
                      )}
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-hanko">
                      {RELATION_LABELS[relationType] ?? relationType}
                    </p>
                    <p className="font-body text-xs leading-snug text-paper line-clamp-2">{relTitle}</p>
                  </Link>
                );
              })}
            </ScrollRail>
          </section>
        )}
      </div>
    </main>
  );
}

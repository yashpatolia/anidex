import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedAnimeById } from "@/lib/anime-cache";
import { AddToListControl } from "@/components/add-to-list-control";
import { ShareButton } from "@/components/share-button";
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
  // A link preview has room for one line, not a paragraph — the synopsis
  // read as noise there. The same at-a-glance facts shown on the page
  // itself (format, episodes, status, year, studio, score, genres) are a
  // more useful summary for deciding whether to click through.
  const score = anime.averageScore != null ? Math.round(anime.averageScore / 10) : null;
  const description =
    [
      anime.format && (FORMAT_LABELS[anime.format] ?? anime.format),
      anime.episodes && `${anime.episodes} episodes`,
      anime.status && (STATUS_LABELS[anime.status] ?? anime.status),
      anime.seasonYear,
      anime.studios.nodes[0]?.name,
      score != null && `${score}/10`,
      anime.genres.length > 0 && anime.genres.join(", "),
    ]
      .filter(Boolean)
      .join(" · ") || undefined;
  // Prefer the wide banner over the portrait cover — link-preview cards
  // (Discord, Twitter, iMessage) are landscape-shaped, so a banner fills
  // the frame instead of being letterboxed/cropped down to a sliver. Falls
  // back to the site-wide default image by its own URL (see the same
  // fallback in src/app/u/[username]/page.tsx for why it's spelled out
  // explicitly instead of left to inherit).
  const image = anime.bannerImage ?? anime.coverImage.extraLarge ?? "/opengraph-image";

  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function AnimeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anilistId = Number(id);
  if (!Number.isInteger(anilistId)) notFound();

  // entry only depends on session (not anime), so it shouldn't wait for
  // both to resolve first — on an AnimeCache miss, getCachedAnimeById can
  // be the slow one (a live AniList round-trip), and there's no reason the
  // list-entry lookup should trail behind that instead of running alongside it.
  const session = await auth();
  const [anime, entry] = await Promise.all([
    getCachedAnimeById(anilistId),
    session?.user
      ? prisma.animeListEntry.findUnique({
          where: { userId_anilistId: { userId: session.user.id, anilistId } },
        })
      : Promise.resolve(null),
  ]);
  if (!anime) notFound();

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
            <div className="flex items-start justify-between gap-4">
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
              <ShareButton title={title} className="flex-shrink-0" />
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-xs uppercase tracking-widest text-ash">
              {[
                anime.format && <span key="format">{FORMAT_LABELS[anime.format] ?? anime.format}</span>,
                anime.episodes && <span key="episodes">{anime.episodes} episodes</span>,
                anime.status && <span key="status">{STATUS_LABELS[anime.status] ?? anime.status}</span>,
                anime.seasonYear && <span key="year">{anime.seasonYear}</span>,
                studio && <span key="studio">{studio}</span>,
                score != null && (
                  <span key="score" className="text-hanko">
                    {score}/10
                  </span>
                ),
              ]
                .filter(Boolean)
                .map((node, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden="true">·</span>}
                    {node}
                  </span>
                ))}
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

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAnimeById } from "@/lib/anilist";
import { AnimeDetailView } from "@/components/anime-detail-view";

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

// The one page left that still fetches AniList server-side — crawlers
// (Discord/Twitter/Slack link previews, search engines) don't run
// JavaScript, so OG/Twitter tags have to already be in the HTML by the
// time they see it. This is a live, uncached, use-once call via
// src/lib/anilist.ts (no server-side persistence, same as everywhere
// else) — it exists only to answer this one request's metadata, not to
// warm anything for later.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const anilistId = Number(id);
  if (!Number.isInteger(anilistId)) return {};

  // This is a live, uncached, single-shot request (see the file comment
  // above) with no fallback behind it the way the old AnimeCache-backed
  // version had — a transient AniList failure here shouldn't take down
  // the whole page (the actual content fetches independently, client-side,
  // and may well succeed even when this server-side call doesn't). Metadata
  // just falls back to the site defaults instead.
  let anime;
  try {
    anime = await getAnimeById(anilistId);
  } catch {
    return {};
  }
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

  return <AnimeDetailView anilistId={anilistId} />;
}

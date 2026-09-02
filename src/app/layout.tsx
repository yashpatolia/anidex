import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "./providers";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import "./globals.css";

// preload: false on both — Zen Kaku Gothic New is a Japanese-script family;
// even restricted to the latin subset, Google splits it into ~40+
// unicode-range chunks, and next/font's default preload: true pushes every
// one of them via a Link header on every single response (measured: ~6KB
// of header, most pages only ever render a couple of those chunks' glyphs).
// Without preload, the browser fetches only the specific files the actual
// rendered text needs, same as loading any other web font.
const zenKaku = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body-family",
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  weight: ["400", "500"],
  preload: false,
});

const description = "A record of everything you've watched.";

export const metadata: Metadata = {
  // Needed for the openGraph/twitter image URLs below (and each page's own
  // opengraph-image route) to resolve to absolute URLs — Discord, Twitter,
  // etc. won't follow a relative one. Falls back to localhost so dev builds
  // don't warn about a missing metadataBase.
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "AniDex: an anime record",
    template: "AniDex - %s",
  },
  description,
  openGraph: {
    siteName: "AniDex",
    type: "website",
    title: "AniDex: an anime record",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "AniDex: an anime record",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${zenKaku.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-paper font-body">
        <Providers>
          <Nav />
          <div className="flex flex-1 flex-col">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

import { ImageResponse } from "next/og";
import { LOGO_GLYPH_LG } from "@/lib/logo-paths";

// Default link-preview image for any page that doesn't set its own
// (src/app/anime/[id]/page.tsx sets openGraph.images directly to the
// anime's own cover/banner art instead of using this). Generated at
// request time rather than a static asset — this app has no image
// storage/upload pipeline for its own assets (same constraint noted on
// the profile banner picker), and a generated image needs neither.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#12100d",
        }}
      >
        <svg width={42} height={42} viewBox="0 0 100 100" style={{ marginBottom: 28 }}>
          <rect width="100" height="100" fill="#b23a2e" />
          <path d={LOGO_GLYPH_LG} fill="#12100d" />
        </svg>
        <div style={{ display: "flex", fontSize: 96, color: "#ede6d6", fontWeight: 700 }}>AniDex</div>
        <div style={{ display: "flex", fontSize: 30, color: "#8a8378", marginTop: 20 }}>
          A record of everything you&apos;ve watched.
        </div>
      </div>
    ),
    { ...size },
  );
}

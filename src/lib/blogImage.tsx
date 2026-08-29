import { ImageResponse } from "next/og";
import { poppinsOgFonts } from "@/lib/ogFonts";

// Standard OG-image dimensions (1.91:1) -- also doubles as the blog
// index/article thumbnail's aspect ratio, so one image serves both.
export const BLOG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

// Same brand tokens as globals.css (--color-*), hardcoded here because
// next/og's ImageResponse renders via satori in an isolated environment
// with no access to the site's CSS custom properties.
const COLORS = {
  bg: "#08090B",
  accent: "#A8FF2A",
  foreground: "#FFFFFF",
  secondary: "#A7ABB4",
  cardBorder: "#1E2128",
};

// satori has no intrinsic "shrink to fit", and its -webkit-line-clamp
// support turned out NOT to actually cap rendered lines in testing here
// (a very long title rendered all 7 wrapped lines instead of being
// clipped to 3, overlapping the footer) -- so line-fitting is done
// deterministically in JS instead of trusted to CSS: step down through a
// few font sizes, and if the title still wouldn't fit in 3 lines even at
// the smallest one, truncate the string itself with an ellipsis. This is
// approximate (average glyph width for bold Poppins, not per-character
// metrics) but errs on the safe side and is verified against real
// rendered output, not just assumed to work.
const TITLE_BOX_WIDTH = 1200 - 80 * 2; // canvas width minus horizontal padding
const AVG_CHAR_WIDTH_RATIO = 0.56; // empirical average for bold proportional sans
const MAX_LINES = 3;
const FONT_SIZE_STEPS = [72, 58, 46];

function maxCharsForFontSize(fontSize: number): number {
  const charsPerLine = TITLE_BOX_WIDTH / (fontSize * AVG_CHAR_WIDTH_RATIO);
  // 0.92 safety margin: word-wrap rarely fills a line edge-to-edge, so a
  // naive charsPerLine * lines estimate would be a bit optimistic.
  return Math.floor(charsPerLine * MAX_LINES * 0.92);
}

function fitTitle(title: string): { fontSize: number; text: string } {
  for (const fontSize of FONT_SIZE_STEPS) {
    if (title.length <= maxCharsForFontSize(fontSize)) {
      return { fontSize, text: title };
    }
  }
  const smallestFontSize = FONT_SIZE_STEPS[FONT_SIZE_STEPS.length - 1];
  const budget = maxCharsForFontSize(smallestFontSize);
  const truncated = title.slice(0, Math.max(0, budget - 1)).trimEnd();
  return { fontSize: smallestFontSize, text: `${truncated}…` };
}

/**
 * Renders one article's branded featured image, using the site's real
 * Poppins font data (src/lib/ogFonts.ts) rather than satori's own
 * fallback -- the same self-hosted fonts src/app/opengraph-image.tsx
 * uses, kept in one shared helper so both stay in sync.
 */
export function renderBlogFeaturedImage(title: string, category: string): ImageResponse {
  const { fontSize, text } = fitTitle(title);
  const lineHeight = 1.15;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: COLORS.bg,
        }}
      >
        <div style={{ display: "flex", height: 6, background: COLORS.accent }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "56px 80px 64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700, fontFamily: "Poppins" }}>
              <span style={{ color: COLORS.accent }}>AI</span>
              <span style={{ color: COLORS.foreground }}>&nbsp;convertly</span>
            </div>
            {category ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: COLORS.accent,
                  border: `2px solid ${COLORS.cardBorder}`,
                  borderRadius: 999,
                  padding: "8px 22px",
                  fontFamily: "Poppins",
                }}
              >
                {category}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                // Defensive backstop on top of fitTitle()'s own character
                // budget: even if the width estimate is slightly off, this
                // hard-clips at exactly MAX_LINES worth of height so text
                // can never visually collide with the footer below it.
                maxHeight: fontSize * lineHeight * MAX_LINES,
                overflow: "hidden",
                fontSize,
                fontWeight: 700,
                color: COLORS.foreground,
                lineHeight,
                letterSpacing: -1,
                fontFamily: "Poppins",
              }}
            >
              {text}
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 24, color: COLORS.secondary, fontFamily: "Poppins" }}>
            aiconvertly.online
          </div>
        </div>
      </div>
    ),
    { ...BLOG_IMAGE_SIZE, fonts: poppinsOgFonts() }
  );
}

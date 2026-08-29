import fs from "node:fs";
import path from "node:path";

/**
 * Real Poppins font data for next/og's ImageResponse (satori) calls --
 * src/app/opengraph-image.tsx, src/app/apple-icon.tsx, src/app/icon.tsx,
 * src/lib/blogImage.tsx. satori renders in an isolated environment with
 * no access to next/font's loaded fonts or the site's own CSS, so it
 * needs actual font file bytes passed via ImageResponse's own `fonts`
 * option -- this is that, self-hosted from src/fonts/ (downloaded once,
 * committed to the repo) rather than fetched live at request time, the
 * same "no live external font request" principle as the site's main
 * next/font/google Poppins loading.
 *
 * Only Regular (400) and Bold (700) -- the two weights every OG/icon
 * image actually uses today; add SemiBold here too if a future one
 * needs 600.
 */
const FONTS_DIR = path.join(process.cwd(), "src", "fonts");

let cached: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[] | null = null;

export function poppinsOgFonts() {
  if (!cached) {
    cached = [
      { name: "Poppins", data: fs.readFileSync(path.join(FONTS_DIR, "Poppins-Regular.ttf")), weight: 400, style: "normal" },
      { name: "Poppins", data: fs.readFileSync(path.join(FONTS_DIR, "Poppins-Bold.ttf")), weight: 700, style: "normal" },
    ];
  }
  return cached;
}

/**
 * Known external tools an article's [SCREENSHOT: ...] marker might name,
 * curated from the competitors named in content/blog/CALENDAR.md. Kept as
 * an explicit registry rather than guessed URLs (e.g. `https://${name}.com`)
 * -- a guessed domain can easily be wrong, parked, or unrelated, and a
 * screenshot of the wrong site is worse than skipping it.
 *
 * kind: "web-interactive" -- a real browser-based tool with its own
 *   upload/convert flow, safe to try a generic file-upload interaction on
 *   (capture-screenshots.mjs still applies the CAPTCHA/payment/signup-wall
 *   checks before doing so).
 * kind: "homepage-only" -- a desktop application (or a web app that
 *   requires a real account for anything beyond the marketing page, e.g.
 *   Canva's editor). There's no interactive state to drive from a headless
 *   browser, so only the homepage/marketing page is captured.
 */
export const EXTERNAL_TOOLS = [
  { match: ["freeconvert"], name: "FreeConvert", url: "https://www.freeconvert.com/video-converter", kind: "web-interactive" },
  { match: ["handbrake"], name: "HandBrake", url: "https://handbrake.fr", kind: "homepage-only" },
  { match: ["any video converter"], name: "Any Video Converter", url: "https://www.any-video-converter.com", kind: "homepage-only" },
  { match: ["freemake"], name: "Freemake", url: "https://www.freemake.com", kind: "homepage-only" },
  { match: ["movavi"], name: "Movavi", url: "https://www.movavi.com", kind: "homepage-only" },
  { match: ["minitool"], name: "MiniTool", url: "https://www.minitool.com", kind: "homepage-only" },
  { match: ["hitpaw"], name: "HitPaw", url: "https://www.hitpaw.com", kind: "homepage-only" },
  { match: ["iloveimg", "i love image"], name: "iLoveIMG", url: "https://www.iloveimg.com/resize-image", kind: "web-interactive" },
  { match: ["powertoys"], name: "PowerToys Image Resizer", url: "https://learn.microsoft.com/en-us/windows/powertoys/image-resizer", kind: "homepage-only" },
  { match: ["canva"], name: "Canva", url: "https://www.canva.com", kind: "homepage-only" },
  { match: ["cloudconvert", "cloud convert"], name: "CloudConvert", url: "https://cloudconvert.com", kind: "web-interactive" },
];

/** Case-insensitive match of a marker's description against the registry above. */
export function findExternalTool(description) {
  const lower = description.toLowerCase();
  return EXTERNAL_TOOLS.find((tool) => tool.match.some((m) => lower.includes(m)));
}

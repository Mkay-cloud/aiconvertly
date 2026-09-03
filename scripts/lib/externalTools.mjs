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
  // URL is the exact one the how-to-open-heic-file article itself already
  // links to as the store listing -- not a guessed/constructed one. It's
  // a plain listing/marketing page (a Get/Install button, no file upload
  // of any kind), so homepage-only.
  { match: ["microsoft store", "heif image extensions"], name: "Microsoft Store", url: "https://apps.microsoft.com/detail/9pmmsr1cgpwg", kind: "homepage-only" },
  // Only the bare domain the article itself names -- these two aren't
  // reachable from this sandbox (blocked by its own network policy, same
  // as iLoveIMG below), so there's no way to confirm a specific tool-page
  // sub-path the way iLoveIMG's or FreeConvert's URL was confirmed. The
  // homepage is the honest choice: not a guessed sub-path, just what the
  // article's own "go to x.com" instruction gives.
  { match: ["passport photo snap", "passportphotosnap"], name: "Passport Photo Snap", url: "https://passportphotosnap.com", kind: "web-interactive" },
  { match: ["imagera"], name: "Imagera", url: "https://imagera.ai", kind: "web-interactive" },
  // A real website, unlike the other YouTube-related mentions in the
  // youtube-video-converter article (Premium's app-locked downloads, the
  // "paste a link" converter sites it's warning against) -- but the
  // specific state a marker here asks for (a signed-in Content list with
  // a video's own three-dot menu open) requires a real account, so this
  // is homepage-only rather than web-interactive, same reasoning as
  // Canva above.
  { match: ["youtube studio"], name: "YouTube Studio", url: "https://studio.youtube.com/", kind: "homepage-only" },
];

/**
 * Matches a marker's tool against the registry above, searching the whole
 * combined text the caller gives it (typically the current section's text
 * up through the marker, same as findInternalTool in capture-screenshots.mjs)
 * rather than just the marker's own isolated description -- a marker like
 * "uploading a photo to the Compress Image to KB tool" doesn't re-state
 * "Passport Photo Snap" itself, relying on an earlier line in the same
 * section ("Go to passportphotosnap.com...") to establish which tool it's
 * about. Whichever registered tool's match string occurs LAST/rightmost in
 * the given text wins, mirroring findInternalTool exactly, so an explicit
 * name later in the text always overrides an earlier one.
 */
/**
 * Returns { tool, index } for whichever registered tool matched last/
 * rightmost, or null if none did. Exposing the match's position (not just
 * the tool) lets the caller compare it against findInternalTool's own
 * match position -- see that function's comment for why that comparison
 * matters (a section that mentions AI Convertly only in passing, while
 * naming an external tool much closer to the marker, must not resolve to
 * AI Convertly just because internal resolution used to be checked
 * unconditionally first).
 */
export function findExternalTool(searchText) {
  const lower = searchText.toLowerCase();
  let bestTool = null;
  let bestIndex = -1;
  for (const tool of EXTERNAL_TOOLS) {
    for (const needle of tool.match) {
      const idx = lower.lastIndexOf(needle);
      if (idx > bestIndex) {
        bestIndex = idx;
        bestTool = tool;
      }
    }
  }
  return bestTool ? { tool: bestTool, index: bestIndex } : null;
}

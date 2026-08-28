/**
 * Generates a generic, code-drawn SVG illustration to stand in for a
 * screenshot that genuinely couldn't be captured (a network-blocked
 * external site, in practice -- see capture-screenshots.mjs). This is
 * deliberately NOT an attempt to fake a real screenshot: it's an abstract
 * "app window" made of plain shapes (a card, a button, a few line
 * placeholders), colored using the tool's genuinely-associated brand/UI
 * colors where those are confidently known, so a reader can still tell at
 * a glance roughly what's being talked about. Never draws a logo,
 * wordmark, or anything imitating a real interface's actual layout or
 * copy -- see TOOL_STYLES's own comment on the boundary this keeps to.
 */

// Neutral gray/white default -- used for any tool not listed in
// TOOL_STYLES below. Getting a competitor's brand color wrong and
// presenting it as if it were genuine would be worse than not
// color-coding at all, so anything not confidently known stays neutral
// rather than guessing (this mirrors the same "never guess a URL"
// principle externalTools.mjs already applies, just for color instead).
const NEUTRAL_STYLE = { accent: "#8B93A1", chrome: "#E7E9EE", card: "#FFFFFF", ink: "#3A4150", confidence: "neutral" };

/**
 * Only tools/platforms whose primary brand or system color is broadly,
 * confidently public knowledge get a real entry here -- not a guess at
 * a specific hex from an unreachable site, just the general color
 * strongly associated with the brand (a purple-ish Canva, a green
 * iLoveIMG, Windows' Fluent blue, macOS' systemBlue-and-light chrome).
 * Everything else in scripts/lib/externalTools.mjs's own registry is
 * intentionally left out of this list and falls through to
 * NEUTRAL_STYLE via styleForTool() below, per this module's own
 * "don't guess" rule.
 */
const TOOL_STYLES = {
  "Canva": { accent: "#8B3DFF", chrome: "#F4F0FF", card: "#FFFFFF", ink: "#2B0A57", confidence: "known" },
  "CloudConvert": { accent: "#1A73E8", chrome: "#EAF1FD", card: "#FFFFFF", ink: "#0B2E63", confidence: "known" },
  "iLoveIMG": { accent: "#6FCB2F", chrome: "#F0FAE9", card: "#FFFFFF", ink: "#20440B", confidence: "known" },
  // Platform conventions, not web tools -- available for a native-app
  // marker (e.g. "On a Mac, Using Preview") that a caller resolves some
  // other way; capture-screenshots.mjs doesn't auto-route to these yet
  // (see its own comment), but the style profiles are ready for it.
  "Windows": { accent: "#0078D4", chrome: "#F3F3F3", card: "#FFFFFF", ink: "#1B1B1B", confidence: "known" },
  "macOS": { accent: "#0A84FF", chrome: "#ECECEC", card: "#FFFFFF", ink: "#1D1D1F", confidence: "known" },
};

export function styleForTool(toolName) {
  return TOOL_STYLES[toolName] ?? NEUTRAL_STYLE;
}

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const WIDTH = 960;
const HEIGHT = 540;

/**
 * Which moment in a tool's flow a marker's own description is actually
 * about, so the illustration can look different for "upload this file"
 * vs. "pick an option" vs. "it's working" vs. "here's the result" --
 * without this, every marker for a given tool rendered the exact same
 * box regardless of what it was meant to show, which was the actual bug
 * this classification exists to fix (three different KB-resize markers
 * for Passport Photo Snap all looked identical before this).
 *
 * Order matters: checked top to bottom, first match wins. "upload" is
 * checked first because it's the most textually distinct (an explicit
 * drop/upload/pick-a-file phrase), which keeps a marker like "picking a
 * photo file" from being caught by the more general "pick/choose" wording
 * in the "select" rule below it.
 */
const VARIANT_RULES = [
  { id: "upload", re: /\b(upload(ing|ed)?|drop(ping|zone)?|drag(ging)?|choose file|select file|browsing|browse|pick(ing)?\s+(a\s+|an\s+|your\s+)?(photo|image|file)s?)\b/i },
  { id: "result", re: /\b(result|finish(ed|ing)?|complete(d)?|download(ed|ing)?|reported size|percent smaller|compressed size|resulting file)\b/i },
  { id: "process", re: /\b(process(ing)?|running|run(s|ning)? the|compress(ing)?|convert(ing)?|progress|loading|working|binary search|click(ing)?\s+(the\s+)?(compress|convert|resize)\b)/i },
  { id: "select", re: /\b(preset|dropdown|selector|option|field|typ(e|ing)|enter(ed|ing)?|choose|choosing|set to|target size|quality slider|percentage|tab)\b/i },
];

export function detectVariant(description) {
  const lower = (description ?? "").toLowerCase();
  for (const rule of VARIANT_RULES) {
    if (rule.re.test(lower)) return rule.id;
  }
  return "generic";
}

/** Circle with an up-arrow -- "add/choose a file" (also the default/generic icon, since it's the safest guess for a marker that didn't clearly match anything more specific). */
function uploadGlyph(style, cx, cy) {
  return `<circle cx="${cx}" cy="${cy}" r="34" fill="none" stroke="${style.accent}" stroke-width="6" />
  <path d="M ${cx} ${cy + 14} L ${cx} ${cy - 14} M ${cx - 14} ${cy - 2} L ${cx} ${cy - 16} L ${cx + 14} ${cy - 2}" fill="none" stroke="${style.accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />`;
}

/** A dropdown-style field (a bordered box with a chevron) plus a row of small option chips -- "pick a setting/preset," not "add a file." */
function selectGlyph(style, cx, cy, contentX) {
  const fieldW = 92;
  const fieldH = 44;
  const fieldX = cx - fieldW / 2;
  const fieldY = cy - fieldH / 2;
  const chevronCx = fieldX + fieldW - 18;
  const chipY = cy + fieldH / 2 + 22;
  const chipW = 56;
  const chipGap = 10;
  const chips = [0, 1, 2]
    .map((i) => {
      const x = contentX + i * (chipW + chipGap);
      const filled = i === 0;
      return `<rect x="${x}" y="${chipY}" width="${chipW}" height="26" rx="13" fill="${filled ? style.accent : "none"}" stroke="${filled ? style.accent : style.chrome}" stroke-width="2" />`;
    })
    .join("\n  ");
  return `<rect x="${fieldX}" y="${fieldY}" width="${fieldW}" height="${fieldH}" rx="10" fill="none" stroke="${style.accent}" stroke-width="5" />
  <path d="M ${chevronCx - 7} ${cy - 4} L ${chevronCx} ${cy + 4} L ${chevronCx + 7} ${cy - 4}" fill="none" stroke="${style.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  ${chips}`;
}

/** A partial ring (a frozen spinner) plus a partly-filled progress bar -- "this is actively running," not "waiting for input" or "done." */
function processGlyph(style, cx, cy, contentX, contentW) {
  const r = 34;
  const barH = 12;
  const barTrackW = contentW;
  const barFilledW = contentW * 0.55;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${style.chrome}" stroke-width="6" />
  <path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r * 0.85} ${cy + r * 0.5}" fill="none" stroke="${style.accent}" stroke-width="6" stroke-linecap="round" />
  <rect x="${contentX}" y="${cy - barH / 2}" width="${barTrackW}" height="${barH}" rx="${barH / 2}" fill="${style.chrome}" />
  <rect x="${contentX}" y="${cy - barH / 2}" width="${barFilledW}" height="${barH}" rx="${barH / 2}" fill="${style.accent}" />`;
}

/** Circle with a checkmark -- "this finished successfully," distinct from both the upload arrow and the mid-process spinner. */
function resultGlyph(style, cx, cy) {
  return `<circle cx="${cx}" cy="${cy}" r="34" fill="none" stroke="${style.accent}" stroke-width="6" />
  <path d="M ${cx - 14} ${cy} L ${cx - 4} ${cy + 12} L ${cx + 16} ${cy - 12}" fill="none" stroke="${style.accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />`;
}

/**
 * Draws one abstract "app window" card: a window-chrome background, a
 * colored accent bar, a centered content card, and a variant-specific
 * icon/content (see detectVariant above) -- all plain geometry,
 * deliberately not shaped like any real product's actual layout.
 * `toolName` is set as plain text below the card (in the site's own
 * generic sans-serif, not any brand's real logotype/font) so a reader
 * can tell what it's standing in for -- identification, not an
 * imitation of the brand's own wordmark styling.
 */
export function renderFallbackIllustrationSVG(toolName, description = "") {
  const style = styleForTool(toolName);
  const variant = detectVariant(description);
  const label = escapeXml(toolName);
  const cardX = 140;
  const cardY = 110;
  const cardW = WIDTH - cardX * 2;
  const cardH = 300;
  const iconCx = cardX + 90;
  const iconCy = cardY + cardH / 2;
  const contentX = iconCx + 70;
  const contentW = cardW - (contentX - cardX) - 40;

  let glyph;
  let content;
  if (variant === "select") {
    glyph = selectGlyph(style, iconCx, iconCy, contentX);
    content = "";
  } else if (variant === "process") {
    glyph = processGlyph(style, iconCx, iconCy, contentX, contentW);
    content = "";
  } else if (variant === "result") {
    glyph = resultGlyph(style, iconCx, iconCy);
    content = `<rect x="${contentX}" y="${iconCy - 38}" width="${contentW}" height="14" rx="7" fill="${style.chrome}" />
  <rect x="${contentX}" y="${iconCy - 10}" width="${contentW * 0.7}" height="14" rx="7" fill="${style.chrome}" />
  <rect x="${contentX}" y="${iconCy + 24}" width="150" height="36" rx="18" fill="${style.accent}" />`;
  } else {
    // "upload" and the "generic" default both use the same up-arrow
    // glyph: a marker that didn't clearly match anything more specific
    // is most often still describing some kind of file-picking step in
    // practice, and this was already the whole illustration before
    // variants existed, so it's the safest fallback shape.
    glyph = uploadGlyph(style, iconCx, iconCy);
    content = `<rect x="${contentX}" y="${iconCy - 38}" width="${contentW}" height="14" rx="7" fill="${style.chrome}" />
  <rect x="${contentX}" y="${iconCy - 10}" width="${contentW * 0.7}" height="14" rx="7" fill="${style.chrome}" />
  <rect x="${contentX}" y="${iconCy + 24}" width="150" height="36" rx="18" fill="${style.accent}" />`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${style.chrome}" />
  <rect x="0" y="0" width="${WIDTH}" height="10" fill="${style.accent}" />
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="20" fill="${style.card}" stroke="${style.chrome}" stroke-width="2" />
  ${glyph}
  ${content}
  <text x="${WIDTH / 2}" y="${cardY + cardH + 56}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="24" fill="${style.ink}">${label}</text>
</svg>`;
}

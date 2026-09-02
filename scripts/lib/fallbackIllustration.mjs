/**
 * Generates a code-drawn SVG illustration to stand in for a screenshot
 * that genuinely couldn't be captured (a network-blocked external site,
 * in practice -- see capture-screenshots.mjs). Deliberately NOT an
 * attempt to fake a real screenshot: it's a generic browser-window
 * illustration -- a titlebar, a filled icon, a heading, and a labeled
 * button, all built from plain shapes and ordinary UI copy ("Drop file
 * here", "Download", ...) that isn't unique to any one product. Never
 * draws a logo, wordmark, or a specific tool's actual layout/copy.
 *
 * Color comes from colorResearch.mjs's live lookup of the tool's real
 * site when that succeeds (see styleForTool), and only falls through to
 * a neutral gray/white style when it doesn't -- see NEUTRAL_STYLE's own
 * comment.
 */

// Genuine last resort -- used only when live color research found
// nothing (site unreachable, or no clear non-gray brand color on the
// page). Presenting an invented color as if it were the tool's real one
// would be worse than not color-coding at all.
const NEUTRAL_STYLE = { accent: "#8B93A1", chrome: "#EEF0F3", titlebar: "#E2E5EA", card: "#FFFFFF", ink: "#3A4150", confidence: "neutral" };

/**
 * Platform conventions, not web tools -- there's no site to research a
 * color from ("Windows" and "macOS" aren't URLs), so these stay as
 * knowledge-based entries: Microsoft's Fluent blue and Apple's
 * systemBlue-and-light chrome are about as broadly, confidently public
 * as a color association gets. Routed to directly by findPlatform below,
 * for a marker naming a native OS app rather than a website.
 */
const PLATFORM_STYLES = {
  Windows: { accent: "#0078D4", chrome: "#F3F3F3", titlebar: "#E8E8E8", card: "#FFFFFF", ink: "#1B1B1B", confidence: "known" },
  macOS: { accent: "#0A84FF", chrome: "#ECECEC", titlebar: "#E3E3E3", card: "#FFFFFF", ink: "#1D1D1F", confidence: "known" },
  // Not an OS, but the same category as the two above: a cross-platform
  // desktop application named in an article, with no browser-drivable
  // interactive state to capture (VLC's conversion feature lives entirely
  // behind its own native menus). VLC's traffic-cone orange is as
  // broadly, confidently public a brand color as Windows blue or macOS
  // blue, so it stays a knowledge-based "known" entry rather than a
  // live color-research result.
  VLC: { accent: "#FF8800", chrome: "#F5F0EA", titlebar: "#EDE4D8", card: "#FFFFFF", ink: "#2B2620", confidence: "known" },
};

/**
 * Marker text that names a native OS app or native desktop application
 * rather than a website -- there's no URL to ever navigate to (unlike
 * scripts/lib/externalTools.mjs's registry), so a marker resolved here
 * skips network capture entirely and goes straight to an illustration in
 * this platform's own style. This is the one case where "the real
 * screenshot can't be captured" is permanent, not just this-pass -- e.g.
 * a "using Preview" step on macOS has no browser-drivable target this
 * sandbox (or any server-side pipeline) could ever reach, not merely one
 * currently blocked. VLC is included here for the same reason even
 * though it isn't an OS: its conversion feature lives behind native
 * menus with no web-drivable equivalent, matching this category exactly.
 */
const PLATFORMS = [
  { match: ["on a mac", "using preview", "mac's preview", "in preview", "preview app"], name: "macOS" },
  { match: ["on windows", "in paint", "windows photos app"], name: "Windows" },
  { match: ["vlc"], name: "VLC" },
];

/**
 * Same { tool, index } shape as findExternalTool in externalTools.mjs
 * (see that function's own comment on why the position matters), so a
 * caller can weigh a platform match against internal/external matches
 * using the identical rightmost-wins comparison.
 */
export function findPlatform(searchText) {
  const lower = searchText.toLowerCase();
  let bestName = null;
  let bestIndex = -1;
  for (const platform of PLATFORMS) {
    for (const needle of platform.match) {
      const idx = lower.lastIndexOf(needle);
      if (idx > bestIndex) {
        bestIndex = idx;
        bestName = platform.name;
      }
    }
  }
  return bestName ? { tool: { name: bestName }, index: bestIndex } : null;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("");
}

/** Linear-interpolates hex toward towardHex by amount (0-1) -- used to derive a light tint of a researched accent color for the card chrome, since research only ever gives us the one accent value. */
function mix(hex, towardHex, amount) {
  const a = hexToRgb(hex);
  const b = hexToRgb(towardHex);
  return rgbToHex(a.r + (b.r - a.r) * amount, a.g + (b.g - a.g) * amount, a.b + (b.b - a.b) * amount);
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [rl, gl, bl] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** White or near-black text, whichever is legible on the given background -- needed because a researched accent color can be light (a pastel brand color) or dark, unlike the old fixed palette where every accent was already chosen dark-on-light. */
function textColorFor(bgHex) {
  return relativeLuminance(bgHex) > 0.45 ? "#16171B" : "#FFFFFF";
}

function styleFromResearchedAccent(accentHex) {
  return {
    accent: accentHex,
    chrome: mix(accentHex, "#FFFFFF", 0.9),
    titlebar: mix(accentHex, "#FFFFFF", 0.82),
    card: "#FFFFFF",
    ink: "#24262B",
    confidence: "researched",
  };
}

/** researchedAccent is a "#rrggbb" string from colorResearch.mjs, or null if research found nothing usable -- see that module for what counts as "nothing usable." */
export function styleForTool(toolName, researchedAccent) {
  if (PLATFORM_STYLES[toolName]) return PLATFORM_STYLES[toolName];
  if (researchedAccent) return styleFromResearchedAccent(researchedAccent);
  return NEUTRAL_STYLE;
}

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const WIDTH = 960;
const HEIGHT = 540;
const CARD_X = 90;
const CARD_Y = 78;
const CARD_W = WIDTH - CARD_X * 2;
const CARD_H = 372;
const TITLEBAR_H = 34;
const ICON_CX = CARD_X + 82;
const ICON_CY = CARD_Y + TITLEBAR_H + (CARD_H - TITLEBAR_H) / 2;
const TEXT_X = ICON_CX + 66;
const TEXT_W = CARD_X + CARD_W - 44 - TEXT_X;

/**
 * Which moment in a tool's flow a marker's own description is actually
 * about, so the illustration looks different for "upload this file" vs.
 * "pick an option" vs. "it's working" vs. "here's the result." Order
 * matters: checked top to bottom, first match wins. "upload" is checked
 * first because it's the most textually distinct (an explicit
 * drop/upload/pick-a-file phrase), which keeps a marker like "picking a
 * photo file" from being caught by the more general "pick/choose"
 * wording under "select".
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

function windowChrome(style) {
  // Only the top two corners need rounding -- a plain rect would be
  // simpler but would show square corners poking past the card's own
  // rounded top edge.
  const r = 16;
  return `<path d="M ${CARD_X} ${CARD_Y + r} A ${r} ${r} 0 0 1 ${CARD_X + r} ${CARD_Y} L ${CARD_X + CARD_W - r} ${CARD_Y} A ${r} ${r} 0 0 1 ${CARD_X + CARD_W} ${CARD_Y + r} L ${CARD_X + CARD_W} ${CARD_Y + TITLEBAR_H} L ${CARD_X} ${CARD_Y + TITLEBAR_H} Z" fill="${style.titlebar}" />
  <circle cx="${CARD_X + 24}" cy="${CARD_Y + TITLEBAR_H / 2}" r="6" fill="#ED6A5E" />
  <circle cx="${CARD_X + 46}" cy="${CARD_Y + TITLEBAR_H / 2}" r="6" fill="#F4BF4F" />
  <circle cx="${CARD_X + 68}" cy="${CARD_Y + TITLEBAR_H / 2}" r="6" fill="#61C454" />`;
}

/** A wrapped block of plain text, since SVG has no native text-wrapping -- splits on whitespace and greedily fills lines under maxCharsPerLine (an estimate from fontSize, not exact metrics, but this is short UI-style copy, not prose, so it doesn't need to be). */
function wrappedText(text, x, y, { fontSize, weight = 400, fill, maxWidth, lineHeight = fontSize * 1.3 }) {
  const maxCharsPerLine = Math.max(6, Math.floor(maxWidth / (fontSize * 0.56)));
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * lineHeight}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`
    )
    .join("\n  ");
}

function button(x, y, label, style) {
  const w = Math.max(96, label.length * 11 + 44);
  const h = 44;
  const textColor = textColorFor(style.accent);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${style.accent}" />
  <text x="${x + w / 2}" y="${y + h / 2 + 6}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="600" fill="${textColor}">${escapeXml(label)}</text>`;
}

/** A filled circle with a white glyph inside -- the same "solid icon" treatment for every variant, just a different glyph, so they read as one consistent icon set rather than mismatched styles. */
function iconCircle(style, glyphPath) {
  return `<circle cx="${ICON_CX}" cy="${ICON_CY}" r="42" fill="${style.accent}" />
  ${glyphPath}`;
}

/** A cloud with an upward arrow -- the standard, generic "upload" icon used across essentially every real product's own UI, not specific to any one of them. */
function uploadGlyph(style) {
  const cx = ICON_CX;
  const cy = ICON_CY;
  const color = textColorFor(style.accent);
  return iconCircle(
    style,
    `<ellipse cx="${cx - 11}" cy="${cy - 2}" rx="10" ry="8" fill="${color}" />
  <ellipse cx="${cx + 9}" cy="${cy}" rx="11" ry="9" fill="${color}" />
  <ellipse cx="${cx}" cy="${cy - 9}" rx="12" ry="10" fill="${color}" />
  <rect x="${cx - 20}" y="${cy - 2}" width="40" height="13" rx="6.5" fill="${color}" />
  <path d="M ${cx} ${cy + 20} L ${cx} ${cy + 2} M ${cx - 7} ${cy + 9} L ${cx} ${cy + 1} L ${cx + 7} ${cy + 9}" fill="none" stroke="${style.accent}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />`
  );
}

/** A dropdown chevron -- the standard "pick a setting" icon. */
function selectGlyph(style) {
  const cx = ICON_CX;
  const cy = ICON_CY;
  const color = textColorFor(style.accent);
  return iconCircle(
    style,
    `<rect x="${cx - 16}" y="${cy - 12}" width="32" height="24" rx="6" fill="none" stroke="${color}" stroke-width="3" />
  <path d="M ${cx - 6} ${cy - 2} L ${cx} ${cy + 5} L ${cx + 6} ${cy - 2}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`
  );
}

/** A partial ring -- the standard "spinner" icon. */
function processGlyph(style) {
  const cx = ICON_CX;
  const cy = ICON_CY;
  const color = textColorFor(style.accent);
  const r = 16;
  return iconCircle(
    style,
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="4" opacity="0.3" />
  <path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r * 0.9} ${cy + r * 0.45}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" />`
  );
}

/** A checkmark -- the standard "done" icon. */
function resultGlyph(style) {
  const cx = ICON_CX;
  const cy = ICON_CY;
  const color = textColorFor(style.accent);
  return iconCircle(style, `<path d="M ${cx - 15} ${cy} L ${cx - 4} ${cy + 12} L ${cx + 17} ${cy - 13}" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />`);
}

const VARIANT_CONTENT = {
  upload: { glyph: uploadGlyph, heading: "Drop file here", secondary: "or click to browse", buttonLabel: "Choose File" },
  select: { glyph: selectGlyph, heading: "Choose an option", secondary: "50 KB · 100 KB · 200 KB", buttonLabel: null },
  process: { glyph: processGlyph, heading: "Processing…", secondary: null, buttonLabel: null, showProgressBar: true },
  result: { glyph: resultGlyph, heading: "Done", secondary: "Your file is ready", buttonLabel: "Download" },
};

function progressBar(x, y, width, style) {
  const h = 12;
  return `<rect x="${x}" y="${y}" width="${width}" height="${h}" rx="${h / 2}" fill="${style.chrome}" />
  <rect x="${x}" y="${y}" width="${width * 0.62}" height="${h}" rx="${h / 2}" fill="${style.accent}" />`;
}

/**
 * Draws one browser-window illustration: a titlebar with the generic
 * "traffic light" window-chrome dots, a solid variant-specific icon, a
 * real heading/secondary line, and (for upload/result) a real labeled
 * button -- all still plain geometry and generic UI copy, deliberately
 * not shaped or worded like any one product's actual layout. `toolName`
 * is set as plain text below the card (in the site's own generic
 * sans-serif, not any brand's real logotype/font) so a reader can tell
 * what it's standing in for -- identification, not an imitation of the
 * brand's own wordmark styling.
 */
export function renderFallbackIllustrationSVG(toolName, description = "", researchedAccent = null) {
  const style = styleForTool(toolName, researchedAccent);
  const variant = detectVariant(description);
  const content = VARIANT_CONTENT[variant] ?? VARIANT_CONTENT.upload;
  const label = escapeXml(toolName);

  const headingY = ICON_CY - (content.secondary || content.showProgressBar ? 12 : 0);
  const pieces = [content.glyph(style)];
  pieces.push(
    `<text x="${TEXT_X}" y="${headingY}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" fill="${style.ink}">${escapeXml(content.heading)}</text>`
  );
  if (content.secondary) {
    pieces.push(wrappedText(content.secondary, TEXT_X, ICON_CY + 20, { fontSize: 16, fill: style.ink, maxWidth: TEXT_W }));
  }
  if (content.showProgressBar) {
    pieces.push(progressBar(TEXT_X, ICON_CY + 12, Math.min(260, TEXT_W), style));
  }
  if (content.buttonLabel) {
    pieces.push(button(TEXT_X, ICON_CY + 30, content.buttonLabel, style));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${style.chrome}" />
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="16" fill="${style.card}" />
  ${windowChrome(style)}
  ${pieces.join("\n  ")}
  <text x="${WIDTH / 2}" y="${CARD_Y + CARD_H + 44}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="22" fill="${style.confidence === "neutral" ? "#5A6070" : style.ink}">${label}</text>
</svg>`;
}

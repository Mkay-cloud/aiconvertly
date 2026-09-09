/**
 * Generates a code-drawn SVG illustration to stand in for a screenshot
 * that genuinely couldn't be captured (a network-blocked external site,
 * or a native OS app/desktop application with no browser-drivable target
 * at all -- see capture-screenshots.mjs). Deliberately NOT an attempt to
 * fake a real screenshot: everything here is built from plain shapes and
 * ordinary UI copy ("Drop file here", "Download", ...) that isn't unique
 * to any one product, and native-platform illustrations (macOS, Windows,
 * VLC) redraw each platform's real *conventions* -- window-control
 * placement, a menu bar, a thumbnail rail, a dark theme, a transport bar
 * -- from scratch, never tracing an actual logo, wordmark, or a real
 * app's exact pixel layout/copy.
 *
 * Color comes from colorResearch.mjs's live lookup of the tool's real
 * site when that succeeds (see styleForTool), and only falls through to
 * a neutral gray/white style when it doesn't -- see NEUTRAL_STYLE's own
 * comment. Native-platform entries (PLATFORM_STYLES) skip research
 * entirely and use a fixed, broadly-public brand color instead.
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

// Extra chrome used only by the native-platform illustrations below (the
// generic/researched-tool template above never uses these): a menu-bar
// or ribbon strip under the titlebar, a macOS-style thumbnail rail, and
// VLC's bottom transport bar. Kept narrow/short enough that none of them
// ever overlaps the icon or button drawn by contentPieces() lower down.
const TOOLBAR_H = 28;
const SIDEBAR_W = 40;
const PLAYBAR_H = 40;

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

/**
 * The top titlebar strip shared by every window-styled illustration: a
 * rounded-top-corner bar in the chrome color, plus window controls drawn
 * in whichever convention actually matches the platform -- macOS's
 * colored traffic-light dots top-left (the default, "mac"), or Windows'
 * plain minimize/maximize/close glyphs top-right ("win"), which VLC also
 * borrows since VLC's own window chrome follows the host OS. Previously
 * every platform got macOS's dots regardless -- a real inaccuracy for
 * Windows and VLC that this fixes.
 */
function windowChrome(style, controls = "mac") {
  const r = 16;
  const bar = `<path d="M ${CARD_X} ${CARD_Y + r} A ${r} ${r} 0 0 1 ${CARD_X + r} ${CARD_Y} L ${CARD_X + CARD_W - r} ${CARD_Y} A ${r} ${r} 0 0 1 ${CARD_X + CARD_W} ${CARD_Y + r} L ${CARD_X + CARD_W} ${CARD_Y + TITLEBAR_H} L ${CARD_X} ${CARD_Y + TITLEBAR_H} Z" fill="${style.titlebar}" />`;
  if (controls === "win") {
    const cy = CARD_Y + TITLEBAR_H / 2;
    const gx = CARD_X + CARD_W - 28;
    return `${bar}
  <path d="M ${gx - 84} ${cy - 5} L ${gx - 74} ${cy - 5}" stroke="${style.ink}" stroke-width="1.4" stroke-linecap="round" />
  <rect x="${gx - 44}" y="${cy - 5}" width="10" height="10" fill="none" stroke="${style.ink}" stroke-width="1.4" />
  <path d="M ${gx - 4} ${cy - 6} L ${gx + 6} ${cy + 6} M ${gx + 6} ${cy - 6} L ${gx - 4} ${cy + 6}" stroke="${style.ink}" stroke-width="1.6" stroke-linecap="round" />`;
  }
  return `${bar}
  <circle cx="${CARD_X + 24}" cy="${CARD_Y + TITLEBAR_H / 2}" r="6" fill="#ED6A5E" />
  <circle cx="${CARD_X + 46}" cy="${CARD_Y + TITLEBAR_H / 2}" r="6" fill="#F4BF4F" />
  <circle cx="${CARD_X + 68}" cy="${CARD_Y + TITLEBAR_H / 2}" r="6" fill="#61C454" />`;
}

/** Centered titlebar text -- macOS puts the document/app title in the middle of the titlebar; Windows and VLC put it flush left, drawn separately by their own render functions instead. */
function centeredTitlebarLabel(title, style) {
  return `<text x="${CARD_X + CARD_W / 2}" y="${CARD_Y + TITLEBAR_H / 2 + 4}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="${style.ink}">${escapeXml(title)}</text>`;
}

/** A thin menu-bar strip with real menu labels (File/Edit/View/... or Media/Playback/...) -- generic UI chrome copy shared by essentially every app in that category, not specific to any one product's actual menu set. */
function menuBar(items, style, opts = {}) {
  const y = CARD_Y + TITLEBAR_H + TOOLBAR_H / 2 + 4;
  const color = opts.color ?? style.ink;
  const bg = opts.bg ?? style.card;
  const size = 12;
  let x = CARD_X + 16;
  const pieces = [`<rect x="${CARD_X}" y="${CARD_Y + TITLEBAR_H}" width="${CARD_W}" height="${TOOLBAR_H}" fill="${bg}" />`];
  for (const item of items) {
    pieces.push(
      `<text x="${x}" y="${y}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="${size}" fill="${color}">${escapeXml(item)}</text>`
    );
    x += item.length * 6.4 + 18;
  }
  return pieces.join("\n  ");
}

/** Preview.app's own signature convention: a narrow thumbnail rail down the left edge, with one "selected" thumbnail highlighted in the accent color. Kept narrow enough (SIDEBAR_W) to never reach the icon drawn by contentPieces(). */
function macSidebar(style) {
  const top = CARD_Y + TITLEBAR_H + TOOLBAR_H;
  const thumbW = 24;
  const thumbH = 32;
  const gap = 10;
  const startY = top + 12;
  const rects = [0, 1, 2].map((i) => {
    const y = startY + i * (thumbH + gap);
    const selected = i === 0;
    return `<rect x="${CARD_X + (SIDEBAR_W - thumbW) / 2}" y="${y}" width="${thumbW}" height="${thumbH}" rx="3" fill="${selected ? style.accent : style.titlebar}" />`;
  });
  return `<rect x="${CARD_X}" y="${top}" width="${SIDEBAR_W}" height="${CARD_Y + CARD_H - top}" fill="${style.chrome}" />
  ${rects.join("\n  ")}
  <path d="M ${CARD_X + SIDEBAR_W} ${top} L ${CARD_X + SIDEBAR_W} ${CARD_Y + CARD_H}" stroke="${style.titlebar}" stroke-width="1" />`;
}

/** Windows Photos' own signature convention: a row of ribbon buttons (Rotate / Edit & Create / Share / Delete) under the titlebar -- generic Fluent-style pill buttons, not a pixel copy of the real ribbon's icons. */
function winRibbon(style) {
  const y = CARD_Y + TITLEBAR_H;
  const items = ["Rotate", "Edit & Create", "Share", "Delete"];
  let x = CARD_X + 16;
  const pieces = [
    `<rect x="${CARD_X}" y="${y}" width="${CARD_W}" height="${TOOLBAR_H}" fill="${style.card}" />`,
    `<path d="M ${CARD_X} ${y + TOOLBAR_H} L ${CARD_X + CARD_W} ${y + TOOLBAR_H}" stroke="${style.titlebar}" stroke-width="1" />`,
  ];
  for (const label of items) {
    const w = label.length * 6.6 + 20;
    pieces.push(`<rect x="${x}" y="${y + 4}" width="${w}" height="${TOOLBAR_H - 8}" rx="4" fill="${style.chrome}" />`);
    pieces.push(
      `<text x="${x + w / 2}" y="${y + TOOLBAR_H / 2 + 4}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="${style.ink}">${escapeXml(label)}</text>`
    );
    x += w + 10;
  }
  return pieces.join("\n  ");
}

/** VLC's own signature convention: a dark transport bar pinned to the bottom of the window, with a seek track, a play glyph, and an elapsed/total time readout -- generic media-player chrome, not a copy of VLC's actual control icons. */
function vlcPlaybar(accentHex) {
  const y = CARD_Y + CARD_H - PLAYBAR_H;
  const trackY = y + 10;
  const trackX = CARD_X + 20;
  const trackW = CARD_W - 40;
  return `<rect x="${CARD_X}" y="${y}" width="${CARD_W}" height="${PLAYBAR_H}" fill="#1B1B1B" />
  <rect x="${trackX}" y="${trackY}" width="${trackW}" height="4" rx="2" fill="#3A3A3A" />
  <rect x="${trackX}" y="${trackY}" width="${trackW * 0.34}" height="4" rx="2" fill="${accentHex}" />
  <circle cx="${trackX + trackW * 0.34}" cy="${trackY + 2}" r="5" fill="${accentHex}" />
  <path d="M ${CARD_X + 26} ${y + 28} L ${CARD_X + 26} ${y + 16} L ${CARD_X + 36} ${y + 22} Z" fill="#EDEDED" />
  <text x="${CARD_X + CARD_W - 20}" y="${y + 26}" text-anchor="end" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#B5B5B5">01:12 / 03:40</text>`;
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
 * The icon + heading + secondary line + (progress bar or button) block
 * shared by every illustration variant, platform-styled ones included --
 * factored out so the platform-specific chrome around it (a menu bar, a
 * ribbon, a dark playback bar) can vary without duplicating this logic.
 */
function contentPieces(style, variant) {
  const content = VARIANT_CONTENT[variant] ?? VARIANT_CONTENT.upload;
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
  return pieces.join("\n  ");
}

/**
 * Preview.app-recognizable window: macOS's traffic-light dots, a
 * centered titlebar filename, a real menu-bar row, and Preview's own
 * signature left-hand thumbnail rail -- not a pixel copy of Preview's
 * actual chrome, but enough of its real conventions that a reader
 * immediately reads "this is a Mac app," which the old shared template
 * never conveyed for any platform.
 */
function renderMacIllustration(style, variant, toolName) {
  const label = escapeXml(toolName);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${style.chrome}" />
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="16" fill="${style.card}" />
  ${windowChrome(style, "mac")}
  ${centeredTitlebarLabel("IMG_0342.png — Preview", style)}
  ${menuBar(["File", "Edit", "View", "Tools", "Window", "Help"], style, { color: "#8A8A8E" })}
  ${macSidebar(style)}
  ${contentPieces(style, variant)}
  <text x="${WIDTH / 2}" y="${CARD_Y + CARD_H + 44}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="22" fill="${style.ink}">${label}</text>
</svg>`;
}

/**
 * Windows Photos-recognizable window: square minimize/maximize/close
 * controls top-right (not macOS's dots, which the old shared template
 * wrongly put here too), a left-aligned title, and a ribbon row of
 * action buttons under the titlebar, matching the real Photos app's own
 * layout conventions without copying its actual icon set.
 */
function renderWindowsIllustration(style, variant, toolName) {
  const label = escapeXml(toolName);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${style.chrome}" />
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="8" fill="${style.card}" />
  ${windowChrome(style, "win")}
  <text x="${CARD_X + 16}" y="${CARD_Y + TITLEBAR_H / 2 + 4}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="${style.ink}">Photos</text>
  ${winRibbon(style)}
  ${contentPieces(style, variant)}
  <text x="${WIDTH / 2}" y="${CARD_Y + CARD_H + 44}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="22" fill="${style.ink}">${label}</text>
</svg>`;
}

/**
 * VLC-recognizable window: its real dark theme (VLC ships dark by
 * default on both platforms it's most commonly captured on), Windows-
 * style window controls, a real menu-bar row, and VLC's own signature
 * bottom transport bar with a seek track and time readout -- all
 * redrawn generically, never the actual VLC cone logo or icon set.
 */
function renderVLCIllustration(style, variant, toolName) {
  const label = escapeXml(toolName);
  const dark = { ...style, chrome: "#141414", titlebar: "#0F0F0F", card: "#1E1E1E", ink: "#EDEDED" };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${dark.chrome}" />
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="8" fill="${dark.card}" />
  ${windowChrome(dark, "win")}
  <path d="M ${CARD_X + 16} ${CARD_Y + TITLEBAR_H / 2 - 7} L ${CARD_X + 28} ${CARD_Y + TITLEBAR_H / 2 + 7} L ${CARD_X + 4} ${CARD_Y + TITLEBAR_H / 2 + 7} Z" fill="${style.accent}" />
  <text x="${CARD_X + 36}" y="${CARD_Y + TITLEBAR_H / 2 + 4}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="${dark.ink}">VLC media player</text>
  ${menuBar(["Media", "Playback", "Audio", "Video", "Subtitle", "Tools", "View", "Help"], dark, { color: "#9A9A9A", bg: dark.card })}
  ${contentPieces(dark, variant)}
  ${vlcPlaybar(style.accent)}
  <text x="${WIDTH / 2}" y="${CARD_Y + CARD_H + 44}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="22" fill="${dark.ink}">${label}</text>
</svg>`;
}

/**
 * Draws one illustration. For a researched/generic tool this is the
 * original browser-window template: a titlebar with the generic
 * "traffic light" dots, a solid variant-specific icon, a real
 * heading/secondary line, and (for upload/result) a real labeled button
 * -- all plain geometry and generic UI copy, deliberately not shaped or
 * worded like any one product's actual layout. For a native-platform
 * tool (macOS, Windows, VLC -- see PLATFORM_STYLES) this instead routes
 * to that platform's own dedicated renderer above, which draws that
 * platform's real window-chrome and navigation conventions rather than
 * reusing the generic template unchanged. `toolName` is set as plain
 * text below the card (in the site's own generic sans-serif, not any
 * brand's real logotype/font) so a reader can tell what it's standing in
 * for -- identification, not an imitation of the brand's own wordmark
 * styling. No caption is ever added alongside the embed, matching every
 * other successful capture in this pipeline.
 */
export function renderFallbackIllustrationSVG(toolName, description = "", researchedAccent = null) {
  const style = styleForTool(toolName, researchedAccent);
  const variant = detectVariant(description);

  if (toolName === "macOS") return renderMacIllustration(style, variant, toolName);
  if (toolName === "Windows") return renderWindowsIllustration(style, variant, toolName);
  if (toolName === "VLC") return renderVLCIllustration(style, variant, toolName);

  const label = escapeXml(toolName);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${style.chrome}" />
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="16" fill="${style.card}" />
  ${windowChrome(style)}
  ${contentPieces(style, variant)}
  <text x="${WIDTH / 2}" y="${CARD_Y + CARD_H + 44}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="22" fill="${style.confidence === "neutral" ? "#5A6070" : style.ink}">${label}</text>
</svg>`;
}

/**
 * Generates a hand-drawn-style SVG illustration to stand in for a
 * screenshot that genuinely couldn't be captured (a network-blocked
 * external site, or a native OS app/desktop application with no
 * browser-drivable target at all -- see capture-screenshots.mjs).
 * Deliberately NOT an attempt to fake a real screenshot: everything here
 * is built from plain shapes, and native-platform illustrations (macOS,
 * Windows, VLC) redraw each platform's real *conventions* -- window-
 * control placement, a menu bar, a thumbnail rail, a dark theme, a
 * transport bar -- from scratch, never tracing an actual logo, wordmark,
 * or a real app's exact pixel layout/copy.
 *
 * Visual language: a plain black-and-white/line-art UI mockup (white
 * cards, gray chrome, black ink -- see INK/CHROME/PAPER below), the same
 * "wikiHow-style" approach this project's sibling site (Techiebull) uses
 * for its own native-UI illustrations (see that repo's scripts/ui_kit.py):
 * real widgets (a labeled field, a toggle, a dropdown's open option list,
 * a thumbnail grid, a timeline track) built from the marker's OWN
 * description text wherever it names real, specific content (an option
 * list, a highlighted item, a percentage), rather than one generic
 * "Drop file here" card reused for every situation regardless of what the
 * step actually is. Color is reserved for exactly one thing: the ANNOTATION
 * (a callout box, its leader line, and whichever specific control it's
 * pointing at) -- never for brand theming, since this only ever needs to
 * read as "someone is pointing at the thing that matters here," not "here
 * is this tool's brand."
 */

// ---------------------------------------------------------------------------
// Palette -- deliberately just three colors. ANNOTATION is the one accent
// used anywhere in these illustrations: it marks both the callout
// (box + leader line + label) and whichever specific control the callout
// is about (a highlighted menu row, the toggle that changed, the clip
// being dragged) so "red" consistently means "this is the thing this step
// is about," never a tool's brand color.
// ---------------------------------------------------------------------------
const INK = "#1A1A1A";
const MUTED = "#6B7280";
const CHROME = "#E5E7EB";
const CHROME_DARK = "#D1D5DB";
const PAPER = "#F4F6F9";
const CARD = "#FFFFFF";
const ANNOTATION = "#C0293F";

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
  let bestLength = 0;
  for (const platform of PLATFORMS) {
    for (const needle of platform.match) {
      const idx = lower.lastIndexOf(needle);
      if (idx > bestIndex) {
        bestIndex = idx;
        bestLength = needle.length;
        bestName = platform.name;
      }
    }
  }
  return bestName ? { tool: { name: bestName }, index: bestIndex, length: bestLength } : null;
}

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Text measurement -- Node has no bundled font-metrics engine (Techiebull's
// Python toolkit measures with a real font via Pillow; there's no
// equivalent lightweight dependency here), so this is a calibrated
// per-character-class estimate rather than an exact measurement: narrow
// characters (i, l, punctuation), wide characters (m, w, uppercase), and
// everything else get different weights instead of one flat multiplier.
// It only has to be good enough to size a callout box and wrap long labels
// without clipping or wasting egregious space -- not pixel-exact.
// ---------------------------------------------------------------------------
const NARROW_CHARS = new Set(["i", "l", "I", "j", "t", "f", ".", ",", "'", ":", ";", "|", "!", "(", ")", "[", "]", " "]);
const WIDE_CHARS = new Set(["m", "w", "M", "W", "@", "%"]);

// Calibrated against real Chromium canvas measureText() output for the same
// font stack (a handful of representative labels/sentences at the sizes
// this file actually uses -- see the git history for the measurement
// script) and deliberately biased to over-estimate by a few percent: an
// over-estimate only wraps a line slightly earlier than strictly necessary,
// while an under-estimate lets text overflow past its box border, which is
// the actual bug this calibration replaced.
function textWidth(str, fontSize, weight = "regular") {
  let units = 0;
  for (const ch of str) {
    if (NARROW_CHARS.has(ch)) units += 0.33;
    else if (WIDE_CHARS.has(ch)) units += 0.9;
    else if (ch >= "A" && ch <= "Z") units += 0.72;
    else if (ch >= "0" && ch <= "9") units += 0.6;
    else units += 0.55;
  }
  return units * fontSize * (weight === "bold" ? 1.22 : 1.1);
}

function wrapText(str, maxWidth, fontSize, weight = "regular") {
  const words = str.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`;
    if (textWidth(candidate, fontSize, weight) <= maxWidth) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

function text(x, y, content, { size = 15, weight = 400, fill = INK, anchor = "start" } = {}) {
  return `<text x="${x}" y="${y}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escapeXml(content)}</text>`;
}

// ---------------------------------------------------------------------------
// Canvas + window chrome
// ---------------------------------------------------------------------------
const WIDTH = 960;
const HEIGHT = 540;
const CARD_X = 90;
const CARD_Y = 78;
const CARD_W = WIDTH - CARD_X * 2;
const CARD_H = 372;
const TITLEBAR_H = 34;
const TOOLBAR_H = 28;
const SIDEBAR_W = 40;
const PLAYBAR_H = 40;
const CALLOUT_BAND_H = 70;

/** The top titlebar strip shared by every window-styled illustration -- macOS's traffic-light dots top-left, or Windows/VLC's plain minimize/maximize/close glyphs top-right. Always the same neutral gray chrome regardless of platform or tool -- color is reserved entirely for the annotation. */
function windowChrome(controls = "mac", dark = false) {
  const chromeColor = dark ? "#0F0F0F" : CHROME;
  const inkColor = dark ? "#EDEDED" : INK;
  const r = 16;
  const bar = `<path d="M ${CARD_X} ${CARD_Y + r} A ${r} ${r} 0 0 1 ${CARD_X + r} ${CARD_Y} L ${CARD_X + CARD_W - r} ${CARD_Y} A ${r} ${r} 0 0 1 ${CARD_X + CARD_W} ${CARD_Y + r} L ${CARD_X + CARD_W} ${CARD_Y + TITLEBAR_H} L ${CARD_X} ${CARD_Y + TITLEBAR_H} Z" fill="${chromeColor}" />`;
  if (controls === "win") {
    const cy = CARD_Y + TITLEBAR_H / 2;
    const gx = CARD_X + CARD_W - 28;
    return `${bar}
  <path d="M ${gx - 84} ${cy - 5} L ${gx - 74} ${cy - 5}" stroke="${inkColor}" stroke-width="1.4" stroke-linecap="round" />
  <rect x="${gx - 44}" y="${cy - 5}" width="10" height="10" fill="none" stroke="${inkColor}" stroke-width="1.4" />
  <path d="M ${gx - 4} ${cy - 6} L ${gx + 6} ${cy + 6} M ${gx + 6} ${cy - 6} L ${gx - 4} ${cy + 6}" stroke="${inkColor}" stroke-width="1.6" stroke-linecap="round" />`;
  }
  return `${bar}
  <circle cx="${CARD_X + 24}" cy="${CARD_Y + TITLEBAR_H / 2}" r="6" fill="${dark ? "#3A3A3A" : CHROME_DARK}" />
  <circle cx="${CARD_X + 46}" cy="${CARD_Y + TITLEBAR_H / 2}" r="6" fill="${dark ? "#3A3A3A" : CHROME_DARK}" />
  <circle cx="${CARD_X + 68}" cy="${CARD_Y + TITLEBAR_H / 2}" r="6" fill="${dark ? "#3A3A3A" : CHROME_DARK}" />`;
}

function centeredTitlebarLabel(title) {
  return text(CARD_X + CARD_W / 2, CARD_Y + TITLEBAR_H / 2 + 4, title, { size: 13, weight: 600, anchor: "middle" });
}

/**
 * "macOS" covers several real apps with genuinely different chrome
 * (QuickTime Player's plain playback window vs. Preview's photo-thumbnail
 * rail vs. iMovie's editor vs. Finder), so a single hardcoded "Preview"
 * titlebar + thumbnail sidebar for all of them is exactly the wrong-chrome-
 * for-the-content mistake this file exists to avoid. Picked from the
 * marker's own description text, never guessed from the tool name alone.
 */
const MACOS_APPS = [
  { match: ["quicktime"], title: "Movie.mov — QuickTime Player", sidebar: false, menu: ["File", "Edit", "View", "Window", "Share", "Help"] },
  { match: ["imovie"], title: "My Movie — iMovie", sidebar: false, menu: ["File", "Edit", "Clip", "Modify", "View", "Window", "Help"] },
  { match: ["photos app", "mac photos", "photos on mac", "in photos"], title: "Photos", sidebar: false, menu: ["File", "Edit", "Image", "View", "Window", "Help"] },
  { match: ["finder", "get info"], title: "Finder", sidebar: false, menu: ["File", "Edit", "View", "Go", "Window", "Help"] },
  { match: ["screenshot toolbar", "shift-command-5", "shift-cmd-5"], title: "Screenshot", sidebar: false, menu: ["File", "Edit", "View", "Window", "Help"] },
];
const DEFAULT_MACOS_APP = { title: "IMG_0342.png — Preview", sidebar: true, menu: ["File", "Edit", "View", "Tools", "Window", "Help"] };

function macAppFor(description) {
  const lower = description.toLowerCase();
  for (const app of MACOS_APPS) {
    if (app.match.some((needle) => lower.includes(needle))) return app;
  }
  return DEFAULT_MACOS_APP;
}

/** Same reasoning as MACOS_APPS/macAppFor, for "Windows" -- Clipchamp (a full timeline editor) and Xbox Game Bar are genuinely different chrome from the Photos app's ribbon, not the same window relabeled. */
const WINDOWS_APPS = [
  { match: ["clipchamp"], title: "Untitled video — Clipchamp", ribbon: null },
  { match: ["xbox game bar", "game bar", "win+g"], title: "Xbox Game Bar", ribbon: null },
  { match: ["microsoft word", "using word"], title: "Document1 — Word", ribbon: ["Compress Pictures", "Save As"] },
];
const DEFAULT_WINDOWS_APP = { title: "Photos", ribbon: ["Rotate", "Edit & Create", "Share", "Delete"] };

function winAppFor(description) {
  const lower = description.toLowerCase();
  for (const app of WINDOWS_APPS) {
    if (app.match.some((needle) => lower.includes(needle))) return app;
  }
  return DEFAULT_WINDOWS_APP;
}

/** Pulls a plain "example.com/path"-style domain out of a tool's real URL, for the address bar below -- never a fabricated one, and never shown at all when no URL is known. */
function domainFrom(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "");
    return `${host}${path}`;
  } catch {
    return null;
  }
}

/** A plain browser address bar under the titlebar, showing the tool's own real domain -- this is what makes a generic external-tool illustration read as "a browser window on that site" instead of a floating, unplaced card. */
function addressBar(domain) {
  const y = CARD_Y + TITLEBAR_H;
  const barH = 30;
  const pillX = CARD_X + 14;
  const pillY = y + 5;
  const pillW = CARD_W - 28;
  const pillH = barH - 10;
  return `<rect x="${CARD_X}" y="${y}" width="${CARD_W}" height="${barH}" fill="${CARD}" />
  <path d="M ${CARD_X} ${y + barH} L ${CARD_X + CARD_W} ${y + barH}" stroke="${CHROME_DARK}" stroke-width="1" />
  <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="${PAPER}" stroke="${CHROME_DARK}" stroke-width="1" />
  <path d="M ${pillX + 16} ${pillY + pillH / 2 - 5} a 5 5 0 0 1 10 0 v 3 h 1 a 2 2 0 0 1 2 2 v 5 a 2 2 0 0 1 -2 2 h -12 a 2 2 0 0 1 -2 -2 v -5 a 2 2 0 0 1 2 -2 h 1 Z" fill="none" stroke="${MUTED}" stroke-width="1.3" />
  ${text(pillX + 38, pillY + pillH / 2 + 4, domain, { size: 12, fill: MUTED })}`;
}

function menuBar(items, { dark = false } = {}) {
  const y = CARD_Y + TITLEBAR_H + TOOLBAR_H / 2 + 4;
  const color = dark ? "#9A9A9A" : "#8A8A8E";
  const bg = dark ? "#1E1E1E" : CARD;
  const size = 12;
  let x = CARD_X + 16;
  const pieces = [`<rect x="${CARD_X}" y="${CARD_Y + TITLEBAR_H}" width="${CARD_W}" height="${TOOLBAR_H}" fill="${bg}" />`];
  for (const item of items) {
    pieces.push(text(x, y, item, { size, fill: color }));
    x += textWidth(item, size) + 18;
  }
  return pieces.join("\n  ");
}

/** Preview.app's own signature convention: a narrow thumbnail rail down the left edge. */
function macSidebar() {
  const top = CARD_Y + TITLEBAR_H + TOOLBAR_H;
  const thumbW = 24;
  const thumbH = 32;
  const gap = 10;
  const startY = top + 12;
  const rects = [0, 1, 2].map((i) => {
    const y = startY + i * (thumbH + gap);
    return `<rect x="${CARD_X + (SIDEBAR_W - thumbW) / 2}" y="${y}" width="${thumbW}" height="${thumbH}" rx="3" fill="${i === 0 ? CHROME_DARK : CHROME}" stroke="${INK}" stroke-width="1" />`;
  });
  return `<rect x="${CARD_X}" y="${top}" width="${SIDEBAR_W}" height="${CARD_Y + CARD_H - top}" fill="${PAPER}" />
  ${rects.join("\n  ")}
  <path d="M ${CARD_X + SIDEBAR_W} ${top} L ${CARD_X + SIDEBAR_W} ${CARD_Y + CARD_H}" stroke="${CHROME_DARK}" stroke-width="1" />`;
}

/** Windows Photos' own signature convention: a row of ribbon buttons under the titlebar. */
function winRibbon(items = ["Rotate", "Edit & Create", "Share", "Delete"]) {
  const y = CARD_Y + TITLEBAR_H;
  let x = CARD_X + 16;
  const pieces = [
    `<rect x="${CARD_X}" y="${y}" width="${CARD_W}" height="${TOOLBAR_H}" fill="${CARD}" />`,
    `<path d="M ${CARD_X} ${y + TOOLBAR_H} L ${CARD_X + CARD_W} ${y + TOOLBAR_H}" stroke="${CHROME_DARK}" stroke-width="1" />`,
  ];
  for (const label of items) {
    const w = textWidth(label, 11) + 20;
    pieces.push(`<rect x="${x}" y="${y + 4}" width="${w}" height="${TOOLBAR_H - 8}" rx="4" fill="${PAPER}" />`);
    pieces.push(text(x + w / 2, y + TOOLBAR_H / 2 + 4, label, { size: 11, anchor: "middle" }));
    x += w + 10;
  }
  return pieces.join("\n  ");
}

/** VLC's own signature convention: a dark transport bar with a seek track, a play glyph, and an elapsed/total time readout. */
function vlcPlaybar() {
  const y = CARD_Y + CARD_H - PLAYBAR_H;
  const trackY = y + 10;
  const trackX = CARD_X + 20;
  const trackW = CARD_W - 40;
  return `<rect x="${CARD_X}" y="${y}" width="${CARD_W}" height="${PLAYBAR_H}" fill="#1B1B1B" />
  <rect x="${trackX}" y="${trackY}" width="${trackW}" height="4" rx="2" fill="#3A3A3A" />
  <rect x="${trackX}" y="${trackY}" width="${trackW * 0.34}" height="4" rx="2" fill="#8A8A8A" />
  <circle cx="${trackX + trackW * 0.34}" cy="${trackY + 2}" r="5" fill="#EDEDED" />
  <path d="M ${CARD_X + 26} ${y + 28} L ${CARD_X + 26} ${y + 16} L ${CARD_X + 36} ${y + 22} Z" fill="#EDEDED" />
  ${text(CARD_X + CARD_W - 20, y + 26, "01:12 / 03:40", { size: 11, fill: "#B5B5B5", anchor: "end" })}`;
}

// ---------------------------------------------------------------------------
// Callout -- the one piece of every illustration that's always the same
// regardless of scene: a red-bordered label (sized to its real wrapped
// text, never guessed) with a dashed leader line and a dot marking exactly
// which control the step is about. This is what makes even a simple scene
// read as "someone annotated this for me" instead of "generic stock icon."
// ---------------------------------------------------------------------------
function calloutLabel(centerX, topY, maxWidth, rawLabel, target) {
  const fontSize = 14;
  const paddingX = 12;
  const paddingY = 8;
  const lineHeight = fontSize * 1.3;
  const lines = wrapText(rawLabel, maxWidth - paddingX * 2, fontSize, "bold").slice(0, 2);
  const boxW = Math.min(maxWidth, Math.max(...lines.map((l) => textWidth(l, fontSize, "bold"))) + paddingX * 2);
  const boxH = lines.length * lineHeight + paddingY * 2 - lineHeight * 0.25;
  const boxX = centerX - boxW / 2;
  const boxY = topY;
  const pieces = [];
  if (target) {
    const anchorX = boxX + boxW / 2;
    pieces.push(`<line x1="${anchorX}" y1="${boxY}" x2="${target.x}" y2="${target.y}" stroke="${ANNOTATION}" stroke-width="2" stroke-dasharray="4,3" />`);
    pieces.push(`<circle cx="${target.x}" cy="${target.y}" r="4" fill="${ANNOTATION}" />`);
  }
  pieces.push(`<rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="6" fill="${CARD}" stroke="${ANNOTATION}" stroke-width="2" />`);
  lines.forEach((line, i) => {
    pieces.push(text(boxX + boxW / 2, boxY + paddingY + fontSize * 0.78 + i * lineHeight, line, { size: fontSize, weight: 700, fill: ANNOTATION, anchor: "middle" }));
  });
  return pieces.join("\n  ");
}

/** Cleans a marker's own description into short callout copy: drops a leading article, capitalizes, strips trailing punctuation, caps length. Never invents new wording -- always a trimmed-down version of what the description itself already said. */
function calloutTextFor(description) {
  let s = description.trim().replace(/\s+/g, " ");
  s = s.replace(/^(the|a|an)\s+/i, "");
  s = s.replace(/[.:;,]+$/, "");
  // Skip the capitalize step when the first word is already a stylized
  // mixed-case brand name (macOS, iOS, iPhone, iMovie...) -- capitalizing
  // just the first letter would mangle "macOS" into "MacOS".
  const firstWord = s.slice(0, s.indexOf(" ") === -1 ? s.length : s.indexOf(" "));
  const isStylizedBrand = /^[a-z]/.test(firstWord) && /[A-Z]/.test(firstWord);
  if (s.length > 0 && !isStylizedBrand) {
    s = s[0].toUpperCase() + s.slice(1);
  }
  if (s.length > 78) s = s.slice(0, 75).replace(/\s+\S*$/, "") + "…";
  return s;
}

// ---------------------------------------------------------------------------
// Scene widgets -- built from the marker's own description text wherever
// it names something real and specific (an option list, a highlighted
// item, a percentage), so the illustration is honest about only what the
// description actually says, never a fabricated guess at neighboring UI
// copy the description didn't mention.
// ---------------------------------------------------------------------------

function iconCircle(cx, cy, r, glyphPath) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${CARD}" stroke="${INK}" stroke-width="2" />
  ${glyphPath}`;
}

function uploadGlyph(cx, cy) {
  return iconCircle(
    cx,
    cy,
    30,
    `<path d="M ${cx} ${cy + 12} L ${cx} ${cy - 8} M ${cx - 8} ${cy} L ${cx} ${cy - 10} L ${cx + 8} ${cy}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M ${cx - 14} ${cy + 12} L ${cx + 14} ${cy + 12}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" />`
  );
}

function processGlyph(cx, cy) {
  return iconCircle(
    cx,
    cy,
    30,
    `<circle cx="${cx}" cy="${cy}" r="14" fill="none" stroke="${MUTED}" stroke-width="3.5" opacity="0.4" />
  <path d="M ${cx} ${cy - 14} A 14 14 0 0 1 ${cx + 12.6} ${cy + 6.3}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" />`
  );
}

function resultGlyph(cx, cy) {
  return iconCircle(cx, cy, 30, `<path d="M ${cx - 13} ${cy} L ${cx - 3} ${cy + 10} L ${cx + 15} ${cy - 11}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />`);
}

function selectGlyph(cx, cy) {
  return iconCircle(
    cx,
    cy,
    30,
    `<rect x="${cx - 14}" y="${cy - 10}" width="28" height="20" rx="4" fill="none" stroke="${INK}" stroke-width="2.6" />
  <path d="M ${cx - 5} ${cy - 1} L ${cx} ${cy + 5} L ${cx + 5} ${cy - 1}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />`
  );
}

function cursorGlyph(cx, cy) {
  return iconCircle(cx, cy, 30, `<path d="M ${cx - 11} ${cy - 13} L ${cx - 11} ${cy + 12} L ${cx - 4} ${cy + 6} L ${cx + 1} ${cy + 15} L ${cx + 7} ${cy + 12} L ${cx + 2} ${cy + 3} L ${cx + 10} ${cy + 3} Z" fill="${CARD}" stroke="${INK}" stroke-width="2" stroke-linejoin="round" />`);
}

function button(x, y, label, { filled = true } = {}) {
  const w = Math.max(96, textWidth(label, 15, "bold") + 36);
  const h = 38;
  if (filled) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${INK}" />
  ${text(x + w / 2, y + h / 2 + 5, label, { size: 14, weight: 700, fill: "#FFFFFF", anchor: "middle" })}`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${CARD}" stroke="${INK}" stroke-width="1.5" />
  ${text(x + w / 2, y + h / 2 + 5, label, { size: 14, weight: 700, fill: INK, anchor: "middle" })}`;
}

/** A labeled field: a small muted caption above a bordered value box -- e.g. a "Preferred DNS" / "8.8.8.8" pair. */
function labeledField(x, y, w, label, value) {
  return `${text(x, y, label, { size: 12, fill: MUTED })}
  <rect x="${x}" y="${y + 8}" width="${w}" height="34" rx="5" fill="${CARD}" stroke="${INK}" stroke-width="1.5" />
  ${text(x + 12, y + 8 + 22, value, { size: 14 })}`;
}

/** A labeled toggle row -- the knob and track use the annotation color, since a toggle being switched IS the specific thing a step is usually about. */
function toggleRow(x, y, w, label, on = true) {
  const trackW = 44;
  const trackH = 24;
  const trackX = x + w - trackW;
  const knobCx = on ? trackX + trackW - trackH / 2 : trackX + trackH / 2;
  return `${text(x, y + 16, label, { size: 15 })}
  <rect x="${trackX}" y="${y}" width="${trackW}" height="${trackH}" rx="${trackH / 2}" fill="${on ? ANNOTATION : CHROME_DARK}" />
  <circle cx="${knobCx}" cy="${y + trackH / 2}" r="${trackH / 2 - 3}" fill="#FFFFFF" />
  ${text(trackX - 10, y + 16, on ? "On" : "Off", { size: 12, fill: MUTED, anchor: "end" })}`;
}

/** A slider with a filled portion up to `percent` and a numeric readout above the handle. */
function sliderControl(x, y, w, percent) {
  const trackH = 8;
  const handleCx = x + (w * percent) / 100;
  return `<rect x="${x}" y="${y}" width="${w}" height="${trackH}" rx="${trackH / 2}" fill="${CHROME_DARK}" />
  <rect x="${x}" y="${y}" width="${w * (percent / 100)}" height="${trackH}" rx="${trackH / 2}" fill="${INK}" />
  <circle cx="${handleCx}" cy="${y + trackH / 2}" r="9" fill="#FFFFFF" stroke="${INK}" stroke-width="2" />
  ${text(handleCx, y - 12, `${percent}`, { size: 13, weight: 700, anchor: "middle" })}`;
}

/** An open option list (a dropdown's own menu, or a settings selector) -- each row is real text taken from the description, never a fabricated neighboring option. highlightIndex, if given, gets a red outline. */
function optionList(x, y, w, options, highlightIndex = -1) {
  const rowH = 38;
  const pieces = [`<rect x="${x}" y="${y}" width="${w}" height="${rowH * options.length}" rx="6" fill="${CARD}" stroke="${INK}" stroke-width="1.5" />`];
  options.forEach((opt, i) => {
    const rowY = y + i * rowH;
    if (i > 0) pieces.push(`<line x1="${x}" y1="${rowY}" x2="${x + w}" y2="${rowY}" stroke="${CHROME_DARK}" stroke-width="1" />`);
    pieces.push(text(x + 16, rowY + rowH / 2 + 5, opt, { size: 14, weight: i === highlightIndex ? 700 : 400 }));
    if (i === highlightIndex) {
      pieces.push(`<rect x="${x + 2}" y="${rowY + 3}" width="${w - 4}" height="${rowH - 6}" rx="4" fill="none" stroke="${ANNOTATION}" stroke-width="2" />`);
    }
  });
  return pieces.join("\n  ");
}

/** A thumbnail grid (a photo library picker) -- each tile is a plain line-art placeholder (mountain + sun), never a fabricated real photo. Selected tiles get a red outline and a small checkmark badge. */
function thumbnailGrid(x, y, w, h, cols, rows, selected) {
  const gap = 10;
  const tileW = (w - gap * (cols - 1)) / cols;
  const tileH = (h - gap * (rows - 1)) / rows;
  const pieces = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const tx = x + c * (tileW + gap);
      const ty = y + r * (tileH + gap);
      const isSelected = selected.includes(i);
      pieces.push(`<rect x="${tx}" y="${ty}" width="${tileW}" height="${tileH}" rx="5" fill="${PAPER}" stroke="${isSelected ? ANNOTATION : CHROME_DARK}" stroke-width="${isSelected ? 2.5 : 1.5}" />`);
      const cx = tx + tileW / 2;
      const cy = ty + tileH / 2;
      pieces.push(
        `<circle cx="${tx + tileW * 0.28}" cy="${ty + tileH * 0.32}" r="${tileH * 0.11}" fill="none" stroke="${MUTED}" stroke-width="1.6" />
  <path d="M ${tx + 6} ${ty + tileH - 8} L ${cx - 4} ${cy + 4} L ${tx + tileW * 0.62} ${ty + tileH * 0.4} L ${tx + tileW - 6} ${ty + tileH - 8} Z" fill="none" stroke="${MUTED}" stroke-width="1.6" stroke-linejoin="round" />`
      );
      if (isSelected) {
        pieces.push(`<circle cx="${tx + tileW - 12}" cy="${ty + 12}" r="9" fill="${ANNOTATION}" />
  <path d="M ${tx + tileW - 16} ${ty + 12} L ${tx + tileW - 13} ${ty + 15} L ${tx + tileW - 8} ${ty + 8}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`);
      }
    }
  }
  return pieces.join("\n  ");
}

/** A video-editor timeline track with a few clip blocks -- one marked as the clip a step is about. */
function timelineTrack(x, y, w, h, clipCount, activeIndex) {
  const gap = 6;
  const clipW = (w - gap * (clipCount - 1)) / clipCount;
  const pieces = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${PAPER}" stroke="${CHROME_DARK}" stroke-width="1" />`];
  for (let i = 0; i < clipCount; i++) {
    const cx = x + i * (clipW + gap);
    const active = i === activeIndex;
    pieces.push(`<rect x="${cx}" y="${y + 6}" width="${clipW}" height="${h - 12}" rx="4" fill="${active ? "#FFFFFF" : CHROME}" stroke="${active ? ANNOTATION : CHROME_DARK}" stroke-width="${active ? 2.5 : 1.5}" />`);
    for (let k = 1; k < 4; k++) {
      pieces.push(`<line x1="${cx + (clipW * k) / 4}" y1="${y + 10}" x2="${cx + (clipW * k) / 4}" y2="${y + h - 10}" stroke="${CHROME_DARK}" stroke-width="1" opacity="0.6" />`);
    }
  }
  return pieces.join("\n  ");
}

/** A small toolbar/ribbon strip with a few pill buttons -- one drawn filled (the real button named in the description), the rest as plain unlabeled outline pills so nothing is fabricated. */
function toolbarButtons(x, y, w, realLabel) {
  const pillH = 32;
  const pieces = [];
  let cx = x;
  const realW = textWidth(realLabel, 13, "bold") + 28;
  pieces.push(`<rect x="${cx}" y="${y}" width="${realW}" height="${pillH}" rx="6" fill="${INK}" />`);
  pieces.push(text(cx + realW / 2, y + pillH / 2 + 4, realLabel, { size: 13, weight: 700, fill: "#FFFFFF", anchor: "middle" }));
  cx += realW + 10;
  for (const w2 of [64, 48]) {
    pieces.push(`<rect x="${cx}" y="${y}" width="${w2}" height="${pillH}" rx="6" fill="${CARD}" stroke="${CHROME_DARK}" stroke-width="1.5" />`);
    cx += w2 + 10;
  }
  return pieces.join("\n  ");
}

// ---------------------------------------------------------------------------
// Scene detection -- picks which widget(s) to draw and what real content to
// put in them, based only on what the marker's own description text says.
// ---------------------------------------------------------------------------

function extractHighlighted(description) {
  // [\w.&/] (not just [\w.&]) so a slash-joined menu item name like
  // "Convert/Save" is captured whole instead of just its last half.
  const m = description.match(/([A-Z][\w.&/]*(?:\s+(?:&|[A-Z][\w.&/]*))*)\s+highlighted\b/);
  return m ? m[1].trim() : null;
}

/** Pulls a real setting/field name out near the word "toggle"/"switch"/"setting(s)" (e.g. "IPv4" out of "the IPv4 settings dialog") so a toggle row's label is never a fabricated placeholder -- an empty string (no label drawn) when the description doesn't actually name one. */
function extractToggleLabel(description) {
  const stripArticle = (s) => s.replace(/^(the|a|an|this|that)\s+/i, "").trim();
  const near = description.match(/\b([A-Z][\w]*(?:\s+[A-Z0-9][\w]*){0,2})\s+(?:settings?|toggle|switch)\b/);
  if (near) {
    const label = stripArticle(near[1]);
    if (label) return label;
  }
  const onOff = description.match(/\bswitch(?:ed)?\s+(?:the\s+)?([A-Z][\w]*(?:\s+[A-Z0-9][\w]*){0,2})\s+(?:on|off|to)\b/i);
  return onOff ? stripArticle(onOff[1]) : "";
}

/** "between MP4 and MOV" -> ["MP4", "MOV"] -- each option capped at a few words and cut off at the next clause boundary ("as", "for", "to", punctuation, or end of string) so a trailing clause like "as the output format" never gets swallowed into the second option's own name. */
function extractOptionsBetween(description) {
  const m = description.match(/\bbetween\s+([\w-]+(?:\s+[\w-]+){0,2}?)\s+and\s+([\w-]+(?:\s+[\w-]+){0,2}?)(?=[.,]|\s+(?:as|for|to|so|which|that|when|while)\b|$)/i);
  if (!m) return null;
  return [m[1].trim(), m[2].trim()];
}

function extractOptionsShowing(description) {
  const m = description.match(/\bshowing\s+(.+?)\s+options?\b/i);
  if (!m) return null;
  const raw = m[1].replace(/,?\s+and\s+/i, ", ");
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^(the|a|an)\s+/i, ""))
    .filter(Boolean);
}

function extractPercent(description) {
  const m = description.match(/\b(\d{1,3})\s*%/) || description.match(/\bslider\b.*?\b(\d{1,3})\b/i);
  return m ? Math.max(5, Math.min(100, parseInt(m[1], 10))) : null;
}

/**
 * Old detectVariant categories (upload/select/process/result), kept as the
 * final fallback layer for the article's own internal-tool-flavored
 * descriptions that don't otherwise name a specific widget -- these still
 * read fine as plain generic UI moments (a drop zone, a spinner, a
 * checkmark), just redrawn in the new line-art style.
 */
const BASIC_RULES = [
  { id: "upload", re: /\b(upload(ing|ed)?|drop(ping|zone)?|drag(ging)?|choose file|select file|browsing|browse|pick(ing)?\s+(a\s+|an\s+|your\s+)?(photo|image|file)s?)\b/i },
  { id: "result", re: /\b(result|finish(ed|ing)?|complete(d)?|download(ed|ing)?|reported size|percent smaller|compressed size|resulting file)\b/i },
  { id: "process", re: /\b(process(ing)?|running|run(s|ning)? the|compress(ing)?|convert(ing)?|progress|loading|working|binary search|click(ing)?\s+(the\s+)?(compress|convert|resize)\b)/i },
];

/** Builds the scene's pieces + the point the callout's leader line should point at, all confined to `rect` ({x,y,w,h}). */
function buildScene(description, rect) {
  const midX = rect.x + rect.w / 2;

  if (/select(ing)?\s+(multiple\s+)?(photos?|images?)\b|\blibrary\b/i.test(description)) {
    const gw = Math.min(420, rect.w - 40);
    const gx = rect.x + (rect.w - gw) / 2;
    const gy = rect.y + 10;
    const gh = Math.min(150, rect.h - 40);
    return { pieces: [thumbnailGrid(gx, gy, gw, gh, 3, 2, [0, 1])], target: { x: gx + gw * 0.17, y: gy + gh * 0.28 } };
  }

  if (/\btimeline\b|\bclips?\b/i.test(description)) {
    const tw = Math.min(460, rect.w - 40);
    const tx = rect.x + (rect.w - tw) / 2;
    const ty = rect.y + rect.h / 2 - 24;
    return { pieces: [timelineTrack(tx, ty, tw, 48, 4, 1)], target: { x: tx + (tw / 4) * 1.5, y: ty } };
  }

  if (/\btoggle\b|\bswitched?\s+(on|off)\b|\bon\/off\b/i.test(description)) {
    const fw = Math.min(320, rect.w - 40);
    const fx = rect.x + (rect.w - fw) / 2;
    const fy = rect.y + rect.h / 2 - 12;
    return { pieces: [toggleRow(fx, fy, fw, extractToggleLabel(description), true)], target: { x: fx + fw - 22, y: fy + 12 } };
  }

  const highlighted = extractHighlighted(description);
  if (highlighted) {
    const rows = ["", highlighted, ""];
    const lw = Math.min(360, rect.w - 40);
    const lx = rect.x + (rect.w - lw) / 2;
    const ly = rect.y + 8;
    return { pieces: [optionList(lx, ly, lw, rows, 1)], target: { x: lx + lw / 2, y: ly + 38 * 1.5 } };
  }

  const between = extractOptionsBetween(description);
  const showing = extractOptionsShowing(description);
  const options = between || showing;
  if (options && options.length >= 2) {
    const lw = Math.min(420, rect.w - 40);
    const lx = rect.x + (rect.w - lw) / 2;
    const ly = rect.y + 8;
    return { pieces: [optionList(lx, ly, lw, options.slice(0, 5))], target: { x: lx + lw / 2, y: ly } };
  }
  // "showing the Download option" (a single named item, not several) --
  // the same honest treatment as extractHighlighted just above: a short
  // list with only that one real row filled in and blank neighbors, never
  // a fabricated menu. Without this, a lone "showing X option" phrase fell
  // through all the way to BASIC_RULES below, where a stray "download" in
  // the sentence could get misread as a finished-download result screen --
  // a real, previously-shipped mismatch (a YouTube Studio menu-opening step
  // illustrated as a completed-download screen instead).
  if (showing && showing.length === 1) {
    const rows = ["", showing[0], ""];
    const lw = Math.min(360, rect.w - 40);
    const lx = rect.x + (rect.w - lw) / 2;
    const ly = rect.y + 8;
    return { pieces: [optionList(lx, ly, lw, rows, 1)], target: { x: lx + lw / 2, y: ly + 38 * 1.5 } };
  }

  const percent = extractPercent(description);
  if (percent !== null || /\bslider\b|\bpercentage\b|\bbitrate\b/i.test(description)) {
    const sw = Math.min(360, rect.w - 60);
    const sx = rect.x + (rect.w - sw) / 2;
    const sy = rect.y + rect.h / 2;
    return { pieces: [sliderControl(sx, sy, sw, percent ?? 60)], target: { x: sx + (sw * (percent ?? 60)) / 100, y: sy } };
  }

  // Only draws a toolbar scene when the description actually names the
  // real button -- when it doesn't (e.g. "the screen recording option",
  // naming a feature rather than a labeled button), falling through to the
  // rules below rather than fabricating a plausible-sounding label like
  // "Export" that the description never said.
  const btnMatch = description.match(/\b(?:the\s+)?\*{0,2}([A-Z][\w&]*(?:\s+[A-Z][\w&]*){0,2})\*{0,2}\s+(?:button|in\s+the\s+top)/);
  if (btnMatch) {
    const label = btnMatch[1];
    const tw = Math.min(300, rect.w - 40);
    const tx = rect.x + (rect.w - tw) / 2;
    const ty = rect.y + rect.h / 2 - 16;
    return { pieces: [toolbarButtons(tx, ty, tw, label)], target: { x: tx + 30, y: ty + 16 } };
  }

  for (const rule of BASIC_RULES) {
    if (rule.re.test(description)) {
      const cx = rect.x + 60;
      const cy = rect.y + rect.h / 2;
      if (rule.id === "upload") {
        return {
          pieces: [uploadGlyph(cx, cy), text(cx + 56, cy - 6, "Drop file here", { size: 20, weight: 700 }), text(cx + 56, cy + 16, "or click to browse", { size: 14, fill: MUTED }), button(cx + 56, cy + 26, "Choose File")],
          target: { x: cx, y: cy },
        };
      }
      if (rule.id === "process") {
        return { pieces: [processGlyph(cx, cy), text(cx + 56, cy - 2, "Processing…", { size: 20, weight: 700 })], target: { x: cx, y: cy } };
      }
      return {
        pieces: [resultGlyph(cx, cy), text(cx + 56, cy - 6, "Done", { size: 20, weight: 700 }), text(cx + 56, cy + 16, "Your file is ready", { size: 14, fill: MUTED }), button(cx + 56, cy + 26, "Download")],
        target: { x: cx, y: cy },
      };
    }
  }

  const cx = midX;
  const cy = rect.y + rect.h / 2 - 10;
  return { pieces: [cursorGlyph(cx, cy)], target: { x: cx, y: cy } };
}

/**
 * Draws one illustration. Every scene shares the same shape: the
 * platform's real window chrome, the scene's own widget(s) built from the
 * marker's actual description text, and a callout label pointing at
 * whichever part of the scene the step is about.
 */
export function renderFallbackIllustrationSVG(toolName, description = "", toolUrl = null) {
  const desc = description || "";

  if (toolName === "macOS") {
    const app = macAppFor(desc);
    const rect = app.sidebar
      ? { x: CARD_X + SIDEBAR_W, y: CARD_Y + TITLEBAR_H + TOOLBAR_H, w: CARD_W - SIDEBAR_W, h: CARD_H - TITLEBAR_H - TOOLBAR_H }
      : { x: CARD_X, y: CARD_Y + TITLEBAR_H + TOOLBAR_H, w: CARD_W, h: CARD_H - TITLEBAR_H - TOOLBAR_H };
    const scene = buildScene(desc, { ...rect, h: rect.h - CALLOUT_BAND_H });
    const calloutY = CARD_Y + CARD_H - CALLOUT_BAND_H + 6;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}" />
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="16" fill="${CARD}" />
  ${windowChrome("mac")}
  ${centeredTitlebarLabel(app.title)}
  ${menuBar(app.menu)}
  ${app.sidebar ? macSidebar() : ""}
  ${scene.pieces.join("\n  ")}
  ${calloutLabel(CARD_X + CARD_W / 2, calloutY, CARD_W - 60, calloutTextFor(desc), scene.target)}
  ${text(WIDTH / 2, CARD_Y + CARD_H + 44, "macOS", { size: 20, fill: MUTED, anchor: "middle" })}
</svg>`;
  }

  if (toolName === "Windows") {
    const app = winAppFor(desc);
    const chromeH = TITLEBAR_H + (app.ribbon ? TOOLBAR_H : 0);
    const rect = { x: CARD_X, y: CARD_Y + chromeH, w: CARD_W, h: CARD_H - chromeH };
    const scene = buildScene(desc, { ...rect, h: rect.h - CALLOUT_BAND_H });
    const calloutY = CARD_Y + CARD_H - CALLOUT_BAND_H + 6;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}" />
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="8" fill="${CARD}" />
  ${windowChrome("win")}
  ${text(CARD_X + 16, CARD_Y + TITLEBAR_H / 2 + 4, app.title, { size: 13, weight: 600 })}
  ${app.ribbon ? winRibbon(app.ribbon) : ""}
  ${scene.pieces.join("\n  ")}
  ${calloutLabel(CARD_X + CARD_W / 2, calloutY, CARD_W - 60, calloutTextFor(desc), scene.target)}
  ${text(WIDTH / 2, CARD_Y + CARD_H + 44, "Windows", { size: 20, fill: MUTED, anchor: "middle" })}
</svg>`;
  }

  if (toolName === "VLC") {
    // VLC's own convert/settings dialogs are genuinely separate, light
    // system dialogs layered over its dark player window (not drawn into
    // the dark video canvas itself), so the scene sits on its own light
    // dialog panel here -- both truer to the real app and what lets every
    // widget's normal light-background text stay readable rather than
    // needing a second dark-mode variant of each one.
    const dialogPad = 18;
    const rect = { x: CARD_X + dialogPad, y: CARD_Y + TITLEBAR_H + TOOLBAR_H + dialogPad, w: CARD_W - dialogPad * 2, h: CARD_H - TITLEBAR_H - TOOLBAR_H - PLAYBAR_H - dialogPad * 2 };
    const scene = buildScene(desc, { ...rect, h: rect.h - CALLOUT_BAND_H });
    const calloutY = rect.y + rect.h - CALLOUT_BAND_H + 6;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#141414" />
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="8" fill="#1E1E1E" />
  ${windowChrome("win", true)}
  <path d="M ${CARD_X + 16} ${CARD_Y + TITLEBAR_H / 2 - 7} L ${CARD_X + 28} ${CARD_Y + TITLEBAR_H / 2 + 7} L ${CARD_X + 4} ${CARD_Y + TITLEBAR_H / 2 + 7} Z" fill="#EDEDED" />
  ${text(CARD_X + 36, CARD_Y + TITLEBAR_H / 2 + 4, "VLC media player", { size: 13, weight: 600, fill: "#EDEDED" })}
  ${menuBar(["Media", "Playback", "Audio", "Video", "Subtitle", "Tools", "View", "Help"], { dark: true })}
  <rect x="${CARD_X + dialogPad}" y="${CARD_Y + TITLEBAR_H + TOOLBAR_H + dialogPad}" width="${CARD_W - dialogPad * 2}" height="${CARD_H - TITLEBAR_H - TOOLBAR_H - PLAYBAR_H - dialogPad * 2}" rx="8" fill="${PAPER}" stroke="${CHROME_DARK}" stroke-width="1" />
  ${scene.pieces.join("\n  ")}
  ${calloutLabel(CARD_X + CARD_W / 2, calloutY, CARD_W - dialogPad * 2 - 40, calloutTextFor(desc), scene.target)}
  ${vlcPlaybar()}
  ${text(WIDTH / 2, CARD_Y + CARD_H + 44, "VLC", { size: 20, fill: "#EDEDED", anchor: "middle" })}
</svg>`;
  }

  // A generic web tool (external site, real name known but no platform
  // chrome to match) -- a plain browser window: titlebar, then an address
  // bar showing the tool's own real domain (when its URL is known) so the
  // scene reads as "a browser window on that site," not an unplaced card.
  const domain = domainFrom(toolUrl);
  const chromeH = TITLEBAR_H + (domain ? 30 : 0);
  const rect = { x: CARD_X, y: CARD_Y + chromeH, w: CARD_W, h: CARD_H - chromeH };
  const scene = buildScene(desc, { ...rect, h: rect.h - CALLOUT_BAND_H });
  const calloutY = CARD_Y + CARD_H - CALLOUT_BAND_H + 6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}" />
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="16" fill="${CARD}" />
  ${windowChrome("mac")}
  ${domain ? addressBar(domain) : ""}
  ${scene.pieces.join("\n  ")}
  ${calloutLabel(CARD_X + CARD_W / 2, calloutY, CARD_W - 60, calloutTextFor(desc), scene.target)}
  ${text(WIDTH / 2, CARD_Y + CARD_H + 44, toolName, { size: 20, fill: MUTED, anchor: "middle" })}
</svg>`;
}

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
 *
 * macOS-specific scenes (2026-09 revision): every native-app illustration
 * in this file used to be built from generic guesses -- a highlighted row
 * with two blank neighboring rows, no real menu content at all. Confirmed
 * live as a real published bug (see the PR this revision shipped in):
 * readers were shown a QuickTime "File menu" with two empty boxes above
 * and below "Export As" instead of QuickTime's actual menu. This revision
 * replaces every native-app marker's scene with one built from real,
 * sourced facts about that app's actual UI (Apple/Microsoft/VideoLAN's own
 * documentation, cited per app below) -- the same "hand-trace from a real
 * reference" standard Techiebull's own writing guide sets for native UI,
 * now actually applied here instead of falling back to a placeholder.
 * Two structural bugs are also fixed for every macOS scene at once:
 * (1) macOS's menu bar is the SYSTEM-WIDE strip at the top of the screen,
 * never inside the app's own window (unlike Windows) -- the old version
 * drew it inside the window, which is wrong for every single macOS
 * illustration, not just QuickTime's. (2) A real macOS document window's
 * titlebar shows just the filename ("Movie.mov"), never a Windows-style
 * "filename — AppName" suffix.
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
// The real, system-wide macOS menu bar strip -- see this file's own top
// comment for why this can no longer be drawn inside the window.
const MENUBAR_H = 24;
// macOS scenes need room above the window for that global bar; every
// other platform (Windows, VLC, generic web) keeps CARD_Y as before.
const CARD_Y_MAC = CARD_Y + MENUBAR_H + 6;
const CARD_H_MAC = CARD_H - MENUBAR_H - 6;

/** The top titlebar strip shared by every window-styled illustration -- macOS's traffic-light dots top-left, or Windows/VLC's plain minimize/maximize/close glyphs top-right. Always the same neutral gray chrome regardless of platform or tool -- color is reserved entirely for the annotation. */
function windowChrome(controls = "mac", dark = false, cardY = CARD_Y, cardH = CARD_H) {
  const chromeColor = dark ? "#0F0F0F" : CHROME;
  const inkColor = dark ? "#EDEDED" : INK;
  const r = 16;
  const bar = `<path d="M ${CARD_X} ${cardY + r} A ${r} ${r} 0 0 1 ${CARD_X + r} ${cardY} L ${CARD_X + CARD_W - r} ${cardY} A ${r} ${r} 0 0 1 ${CARD_X + CARD_W} ${cardY + r} L ${CARD_X + CARD_W} ${cardY + TITLEBAR_H} L ${CARD_X} ${cardY + TITLEBAR_H} Z" fill="${chromeColor}" />`;
  if (controls === "win") {
    const cy = cardY + TITLEBAR_H / 2;
    const gx = CARD_X + CARD_W - 28;
    return `${bar}
  <path d="M ${gx - 84} ${cy - 5} L ${gx - 74} ${cy - 5}" stroke="${inkColor}" stroke-width="1.4" stroke-linecap="round" />
  <rect x="${gx - 44}" y="${cy - 5}" width="10" height="10" fill="none" stroke="${inkColor}" stroke-width="1.4" />
  <path d="M ${gx - 4} ${cy - 6} L ${gx + 6} ${cy + 6} M ${gx + 6} ${cy - 6} L ${gx - 4} ${cy + 6}" stroke="${inkColor}" stroke-width="1.6" stroke-linecap="round" />`;
  }
  return `${bar}
  <circle cx="${CARD_X + 24}" cy="${cardY + TITLEBAR_H / 2}" r="6" fill="${dark ? "#3A3A3A" : CHROME_DARK}" />
  <circle cx="${CARD_X + 46}" cy="${cardY + TITLEBAR_H / 2}" r="6" fill="${dark ? "#3A3A3A" : CHROME_DARK}" />
  <circle cx="${CARD_X + 68}" cy="${cardY + TITLEBAR_H / 2}" r="6" fill="${dark ? "#3A3A3A" : CHROME_DARK}" />`;
}

function centeredTitlebarLabel(title, cardY = CARD_Y) {
  return text(CARD_X + CARD_W / 2, cardY + TITLEBAR_H / 2 + 4, title, { size: 13, weight: 600, anchor: "middle" });
}

/**
 * A simplified, generic apple-silhouette glyph -- the same treatment
 * already established elsewhere in this file for macOS's own traffic-
 * light window controls (a real Apple UI convention redrawn in plain
 * line art, not a photographed/vector-traced logo lift). Needed for the
 * new global menu bar below: leaving it out would make an unmistakably-
 * macOS top bar read as an unplaced generic OS strip.
 */
function appleGlyph(cx, cy) {
  const s = 0.8;
  return `<path d="M ${cx + 3 * s} ${cy - 4 * s} c 1.2 -1.4 2 -3.3 1.8 -5.2 -1.7 0.1 -3.7 1.2 -4.9 2.6 -1.1 1.3 -2 3.2 -1.7 5 1.8 0.2 3.6 -1 4.8 -2.4 Z" fill="${INK}" />
  <path d="M ${cx + 3.6 * s} ${cy - 1.6 * s} c -2.6 -1.6 -3 -4.6 -0.7 -6.3 -0.7 -1.1 -2 -1.8 -3.4 -1.9 -1.4 -0.1 -3 0.8 -3.8 0.8 -0.8 0 -2.1 -0.8 -3.5 -0.8 -1.8 0 -3.5 1.1 -4.4 2.7 -1.9 3.3 -0.5 8.1 1.3 10.8 0.9 1.3 2 2.8 3.4 2.7 1.3 -0.1 1.9 -0.9 3.5 -0.9 1.7 0 2.2 0.9 3.6 0.8 1.5 -0.1 2.4 -1.3 3.3 -2.6 1 -1.5 1.5 -3 1.5 -3 -0.1 0 -2.8 -1.1 -2.8 -4.3 Z" fill="${INK}" />`;
}

/**
 * The real, system-wide macOS menu bar (Apple menu, bold app name, then
 * the app's own top-level menus) -- see this file's top comment for why
 * this replaced drawing a menu strip inside the window. Returns each
 * item's x-position too, so a caller can anchor a dropdown under
 * whichever item it needs (almost always "File").
 */
function macGlobalMenuBar(appName, items) {
  const pieces = [
    `<rect x="0" y="0" width="${WIDTH}" height="${MENUBAR_H}" fill="${CARD}" />`,
    `<line x1="0" y1="${MENUBAR_H}" x2="${WIDTH}" y2="${MENUBAR_H}" stroke="${CHROME_DARK}" stroke-width="1" />`,
    appleGlyph(24, MENUBAR_H / 2),
  ];
  let x = 42;
  pieces.push(text(x, MENUBAR_H / 2 + 4, appName, { size: 12.5, weight: 700 }));
  x += textWidth(appName, 12.5, "bold") + 22;
  const positions = {};
  for (const item of items) {
    positions[item] = x;
    pieces.push(text(x, MENUBAR_H / 2 + 4, item, { size: 12.5, weight: 400 }));
    x += textWidth(item, 12.5) + 18;
  }
  pieces.push(text(WIDTH - 16, MENUBAR_H / 2 + 4, "9:41", { size: 12, fill: MUTED, anchor: "end" }));
  return { svg: pieces.join("\n  "), positions };
}

/**
 * One real-macOS-style dropdown/cascading menu panel: a divider between
 * grouped sections, a submenu caret (▸) for a row that has one, and a
 * highlighted row drawn with the same red-outline "this is the thing this
 * step is about" convention used everywhere else in this file (never a
 * solid fill -- that would read as this project's own brand color).
 * Returns the highlighted row's own {x, y} (bottom-right corner, not its
 * text baseline -- a leader line ending mid-row would cut straight
 * through the label) plus its top-left corner, so a cascading submenu can
 * anchor immediately to its right.
 */
function dropdownPanel(x, y, rows, { width = 240, rowH = 25 } = {}) {
  const dividerH = 9;
  let cy = y + 6;
  const pieces = [];
  let highlightPoint = null;
  let highlightTop = null;
  for (const row of rows) {
    if (row.divider) {
      pieces.push(`<line x1="${x + 8}" y1="${cy + dividerH / 2}" x2="${x + width - 8}" y2="${cy + dividerH / 2}" stroke="${CHROME_DARK}" stroke-width="1" />`);
      cy += dividerH;
      continue;
    }
    const rowY = cy;
    if (row.highlight) {
      pieces.push(`<rect x="${x + 4}" y="${rowY + 2}" width="${width - 8}" height="${rowH - 4}" rx="4" fill="none" stroke="${ANNOTATION}" stroke-width="2" />`);
      highlightPoint = { x: x + width - 4, y: rowY + rowH - 2 };
      highlightTop = { x: x + width, y: rowY };
    }
    pieces.push(text(x + 16, rowY + rowH / 2 + 4, row.label, { size: 13, weight: row.highlight ? 700 : 400, fill: row.highlight ? ANNOTATION : INK }));
    if (row.lock) {
      // A small drawn padlock (body + shackle), not an emoji glyph -- every
      // other icon in this file is a hand-drawn vector path, and an emoji
      // character would render in the system emoji font instead of this
      // illustration's own line-art style.
      const lx = x + width - 24;
      const ly = rowY + rowH / 2;
      pieces.push(`<path d="M ${lx - 3} ${ly - 1} L ${lx - 3} ${ly - 4} A 3 3 0 0 1 ${lx + 3} ${ly - 4} L ${lx + 3} ${ly - 1}" fill="none" stroke="${MUTED}" stroke-width="1.4" />
  <rect x="${lx - 4.5}" y="${ly - 1}" width="9" height="7" rx="1.5" fill="none" stroke="${MUTED}" stroke-width="1.4" />`);
    }
    if (row.submenu) {
      const ax = x + width - 16;
      const ay = rowY + rowH / 2;
      pieces.push(`<path d="M ${ax - 3} ${ay - 4} L ${ax + 3} ${ay} L ${ax - 3} ${ay + 4} Z" fill="${row.highlight ? ANNOTATION : MUTED}" />`);
    }
    cy += rowH;
  }
  const totalH = cy - y + 6;
  const shadow = `<rect x="${x + 3}" y="${y + 4}" width="${width}" height="${totalH}" rx="8" fill="#000000" opacity="0.12" />`;
  const panel = `<rect x="${x}" y="${y}" width="${width}" height="${totalH}" rx="8" fill="${CARD}" stroke="${CHROME_DARK}" stroke-width="1" />`;
  return { svg: [shadow, panel, ...pieces].join("\n  "), width, height: totalH, highlightPoint, highlightTop };
}

/** A plain cascading submenu -- a flat option list with no dividers or carets, used for a resolution/format list opening off a parent menu's highlighted row. `selected`, if given, marks one row with a small checkmark (macOS's real convention for "this is the current choice") rather than the red annotation outline, since being-the-current-value and being-what-this-step-points-at are two different things. */
function cascadeOptionList(x, y, options, { selected = -1 } = {}) {
  const w = 200;
  const rowH = 26;
  const pieces = [
    `<rect x="${x + 3}" y="${y + 4}" width="${w}" height="${rowH * options.length + 8}" rx="8" fill="#000000" opacity="0.12" />`,
    `<rect x="${x}" y="${y}" width="${w}" height="${rowH * options.length + 8}" rx="8" fill="${CARD}" stroke="${CHROME_DARK}" stroke-width="1" />`,
  ];
  options.forEach((opt, i) => {
    const rowY = y + 4 + i * rowH;
    if (i === selected) {
      pieces.push(`<path d="M ${x + 14} ${rowY + rowH / 2} L ${x + 19} ${rowY + rowH / 2 + 5} L ${x + 27} ${rowY + rowH / 2 - 6}" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`);
    }
    pieces.push(text(x + 36, rowY + rowH / 2 + 4, opt, { size: 13 }));
  });
  return pieces.join("\n  ");
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
  const firstWord = s.slice(0, s.indexOf(" ") === -1 ? s.length : s.indexOf(" "));
  const isStylizedBrand = /^[a-z]/.test(firstWord) && /[A-Z]/.test(firstWord);
  if (s.length > 0 && !isStylizedBrand) {
    s = s[0].toUpperCase() + s.slice(1);
  }
  // calloutLabel wraps this onto up to 2 lines at the card's own width, so
  // the cap here only needs to guard against a truly pathological marker
  // description -- every one of this rewrite's real 41 markers (longest is
  // 83 characters) wraps cleanly into 2 lines well under this limit.
  if (s.length > 160) s = s.slice(0, 157).replace(/\s+\S*$/, "") + "…";
  return s;
}

// ---------------------------------------------------------------------------
// Generic scene widgets -- kept as the fallback layer for markers that
// don't match one of the specific, real-content scenes below (a future
// article reusing "on a Mac"/"on Windows"/"VLC" phrasing this file hasn't
// been taught yet). Unchanged from before this revision.
// ---------------------------------------------------------------------------

function iconCircle(cx, cy, r, glyphPath) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${CARD}" stroke="${INK}" stroke-width="2" />
  ${glyphPath}`;
}
function uploadGlyph(cx, cy) {
  return iconCircle(cx, cy, 30, `<path d="M ${cx} ${cy + 12} L ${cx} ${cy - 8} M ${cx - 8} ${cy} L ${cx} ${cy - 10} L ${cx + 8} ${cy}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M ${cx - 14} ${cy + 12} L ${cx + 14} ${cy + 12}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" />`);
}
function processGlyph(cx, cy) {
  return iconCircle(cx, cy, 30, `<circle cx="${cx}" cy="${cy}" r="14" fill="none" stroke="${MUTED}" stroke-width="3.5" opacity="0.4" />
  <path d="M ${cx} ${cy - 14} A 14 14 0 0 1 ${cx + 12.6} ${cy + 6.3}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" />`);
}
function resultGlyph(cx, cy) {
  return iconCircle(cx, cy, 30, `<path d="M ${cx - 13} ${cy} L ${cx - 3} ${cy + 10} L ${cx + 15} ${cy - 11}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />`);
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
function sliderControl(x, y, w, percent, { label = null } = {}) {
  const trackH = 8;
  const handleCx = x + (w * percent) / 100;
  return `${label ? text(x, y - 18, label, { size: 12, fill: MUTED }) : ""}
  <rect x="${x}" y="${y}" width="${w}" height="${trackH}" rx="${trackH / 2}" fill="${CHROME_DARK}" />
  <rect x="${x}" y="${y}" width="${w * (percent / 100)}" height="${trackH}" rx="${trackH / 2}" fill="${INK}" />
  <circle cx="${handleCx}" cy="${y + trackH / 2}" r="9" fill="#FFFFFF" stroke="${INK}" stroke-width="2" />
  ${text(handleCx, y - 12, `${percent}%`, { size: 13, weight: 700, anchor: "middle" })}`;
}
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
function thumbnailGrid(x, y, w, h, cols, rows, selected, { style = "outline" } = {}) {
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
      // Two real, sourced selection conventions: macOS Photos tints the
      // whole selected thumbnail (a translucent overlay), while Windows
      // Photos shows a small checkbox on each tile -- these are genuinely
      // different platform behaviors, not the same widget recolored.
      const fillColor = style === "mac-tint" && isSelected ? "#F7D9DC" : PAPER;
      pieces.push(`<rect x="${tx}" y="${ty}" width="${tileW}" height="${tileH}" rx="5" fill="${fillColor}" stroke="${isSelected ? ANNOTATION : CHROME_DARK}" stroke-width="${isSelected ? 2.5 : 1.5}" />`);
      const cx = tx + tileW / 2;
      const cy = ty + tileH / 2;
      // The sun sits right-of-center rather than in the classic top-left
      // corner so it never collides with the win-checkbox badge, which is
      // pinned to that corner below.
      pieces.push(`<circle cx="${tx + tileW * 0.62}" cy="${ty + tileH * 0.3}" r="${tileH * 0.11}" fill="none" stroke="${MUTED}" stroke-width="1.6" />
  <path d="M ${tx + 6} ${ty + tileH - 8} L ${cx - 4} ${cy + 4} L ${tx + tileW * 0.62} ${ty + tileH * 0.4} L ${tx + tileW - 6} ${ty + tileH - 8} Z" fill="none" stroke="${MUTED}" stroke-width="1.6" stroke-linejoin="round" />`);
      if (isSelected && style === "win-checkbox") {
        pieces.push(`<rect x="${tx + 6}" y="${ty + 6}" width="16" height="16" rx="3" fill="${ANNOTATION}" />
  <path d="M ${tx + 9} ${ty + 14} L ${tx + 13} ${ty + 18} L ${tx + 19} ${ty + 9}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`);
      } else if (isSelected) {
        pieces.push(`<circle cx="${tx + tileW - 12}" cy="${ty + 12}" r="9" fill="${ANNOTATION}" />
  <path d="M ${tx + tileW - 16} ${ty + 12} L ${tx + tileW - 13} ${ty + 15} L ${tx + tileW - 8} ${ty + 8}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`);
      }
    }
  }
  return pieces.join("\n  ");
}

// ---------------------------------------------------------------------------
// Real-app scene builders -- each one draws a specific, sourced UI state
// for one native app. See this file's top comment for the research this
// is built from; a short citation sits on each group below.
// ---------------------------------------------------------------------------

/** QuickTime Player's real File menu (macOS support docs + secondary sources -- see PR description for full citation list). */
function quickTimeFileMenuRows(highlight) {
  return [
    { label: "New Movie Recording" },
    { label: "New Audio Recording" },
    { label: "New Screen Recording" },
    { divider: true },
    { label: "Open…" },
    { label: "Open Recent", submenu: true },
    { divider: true },
    { label: "Close" },
    { label: "Save…" },
    { divider: true },
    { label: "Export As…", submenu: true, highlight: highlight === "export" },
    { label: "Share…", submenu: true },
  ];
}

/** macOS Preview's real Export dialog (support.apple.com/guide/preview/prvw1012: File > Export, a Format pop-up with JPEG among the choices, a Quality control that appears once JPEG/JPEG-2000 is chosen -- confirmed percentage-based, not word labels, per OS X Daily's compression walkthrough). Field order (Export As / Tags / Where / Format) matches every macOS save-panel dialog. */
function previewExportDialog(x, y, { showQuality = false, quality = 80 } = {}) {
  const w = 380;
  const rowH = 34;
  const pieces = [`<rect x="${x}" y="${y}" width="${w}" height="${showQuality ? 210 : 170}" rx="8" fill="${CARD}" stroke="${INK}" stroke-width="1.5" />`];
  let cy = y + 26;
  pieces.push(text(x + 16, cy, "Export As:", { size: 12, fill: MUTED }));
  pieces.push(`<rect x="${x + 16}" y="${cy + 6}" width="${w - 32}" height="26" rx="4" fill="${PAPER}" stroke="${CHROME_DARK}" stroke-width="1" />`);
  pieces.push(text(x + 26, cy + 24, "image", { size: 13 }));
  cy += rowH + 10;
  pieces.push(text(x + 16, cy, "Where:", { size: 12, fill: MUTED }));
  pieces.push(`<rect x="${x + 16}" y="${cy + 6}" width="${w - 32}" height="26" rx="4" fill="${PAPER}" stroke="${CHROME_DARK}" stroke-width="1" />`);
  pieces.push(text(x + 26, cy + 24, "Downloads", { size: 13, fill: MUTED }));
  cy += rowH + 10;
  pieces.push(text(x + 16, cy, "Format:", { size: 12, fill: MUTED }));
  pieces.push(`<rect x="${x + 16}" y="${cy + 6}" width="${w - 32}" height="26" rx="4" fill="${CARD}" stroke="${ANNOTATION}" stroke-width="2" />`);
  pieces.push(text(x + 26, cy + 24, "JPEG", { size: 13, weight: 700, fill: ANNOTATION }));
  pieces.push(`<path d="M ${x + w - 28} ${cy + 15} L ${x + w - 22} ${cy + 21} L ${x + w - 16} ${cy + 15}" fill="none" stroke="${ANNOTATION}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />`);
  const formatTarget = { x: x + w - 16, y: cy + 15 };
  let qualityTarget = null;
  if (showQuality) {
    // sliderControl draws its own label 18px above the y it's given (it
    // expects y to be the track's own top, not a text-row baseline like
    // the rows above), so this needs more clearance than a plain row change
    // or the "Quality:" label lands on top of the Format row's box above it.
    cy += rowH + 24;
    qualityTarget = { x: x + 16 + (w - 32) * (quality / 100), y: cy };
    pieces.push(sliderControl(x + 16, cy, w - 32, quality, { label: "Quality:" }));
  }
  return { svg: pieces.join("\n  "), width: w, height: showQuality ? 210 : 170, formatTarget, qualityTarget };
}

/** The standard macOS Get Info panel (Apple Support "Get file, folder, and disk information on Mac" + eclecticlight.co's field-by-field breakdown): General section fields in order Kind / Size / Where / Created / Modified. Size shown as "<decimal size> on disk (<exact bytes>)". */
function getInfoPanel(x, y, { sizeText = "812 KB on disk (831,204 bytes)" } = {}) {
  const w = 372;
  const rows = [
    ["Kind", "JPEG image"],
    ["Size", sizeText],
    ["Where", "Downloads"],
    ["Created", "Today at 2:14 PM"],
    ["Modified", "Today at 2:14 PM"],
  ];
  const rowH = 28;
  const headerH = 30;
  const h = headerH + rows.length * rowH + 16;
  const pieces = [
    `<rect x="${x + 3}" y="${y + 4}" width="${w}" height="${h}" rx="8" fill="#000000" opacity="0.1" />`,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${CARD}" stroke="${CHROME_DARK}" stroke-width="1" />`,
    `<line x1="${x}" y1="${y + headerH}" x2="${x + w}" y2="${y + headerH}" stroke="${CHROME_DARK}" stroke-width="1" />`,
    text(x + w / 2, y + headerH / 2 + 5, "image.jpg Info", { size: 13, weight: 700, anchor: "middle" }),
    text(x + 16, y + headerH + 18, "General", { size: 11, weight: 700, fill: MUTED }),
  ];
  let cy = y + headerH + 30;
  let sizeTarget = null;
  for (const [label, value] of rows) {
    const isSize = label === "Size";
    if (isSize) {
      pieces.push(`<rect x="${x + 8}" y="${cy - 15}" width="${w - 16}" height="22" rx="4" fill="none" stroke="${ANNOTATION}" stroke-width="2" />`);
      sizeTarget = { x: x + w - 8, y: cy - 4 };
    }
    pieces.push(text(x + 16, cy, label, { size: 12, fill: MUTED }));
    pieces.push(text(x + 110, cy, value, { size: 12.5, weight: isSize ? 700 : 400, fill: isSize ? ANNOTATION : INK }));
    cy += rowH;
  }
  return { svg: pieces.join("\n  "), width: w, height: h, sizeTarget };
}

/** macOS Photos' real slideshow tools (support.apple.com/guide/photos/create-slideshows-phtae8c6d40: a Themes button and a Duration button with "Fit to Music"/"Custom" -- the 8 real theme names are well-documented across multiple sources though not itemized in Apple's current guide text). Multi-select uses a translucent tint over the thumbnail, not a checkmark (Apple's guide doesn't spell out the visual, but a checkmark badge is the confirmed iOS/iPadOS convention, not Mac's -- a plain tint is the safer, non-fabricated choice here). */
const PHOTOS_THEMES = ["Ken Burns", "Origami", "Sliding Panels", "Magazine", "Holiday", "Vintage", "Reflections", "Classic"];

/** iMovie's real 3-pane layout and Share destinations (support.apple.com/guide/imovie: browser + viewer + timeline; File/Email/YouTube & Facebook as real Share destinations; a background-music well sits below the main clip row, distinct from synced clip audio). */
const IMOVIE_SHARE_DESTINATIONS = ["Email", "File", "YouTube & Facebook"];

/** VLC's real Media menu, in the real documented order (VideoLAN's own wiki), and its real built-in Convert/Save profile names. */
const VLC_MEDIA_MENU = ["Open File…", "Advanced Open File…", "Open Folder…", "Open Disc…", "Open Network Stream…", "Open Capture Device…", "Open Location from Clipboard", "Recent Media", "Save Playlist to File…", "Convert / Save…", "Streaming…", "Quit"];
const VLC_PROFILES = ["Video - H.264 + MP3 (MP4)", "Video - H.265 + MP3 (MP4)", "Video - VP80 + Vorbis (WebM)", "Audio - MP3", "Video for iPod/Android"];

/** Clipchamp's real left sidebar tabs and export resolution list (support.microsoft.com/.../clipchamp: Your Media, Record & create, Content Library, Video templates, Text, Transitions, Brand Kit; "1080p is the largest free resolution we offer" -- 480p/720p/1080p free, 4K Premium-gated). */
const CLIPCHAMP_TABS = ["Your Media", "Record & create", "Content Library", "Text", "Transitions"];
const CLIPCHAMP_RESOLUTIONS = [
  { label: "480p", note: "Draft" },
  { label: "720p", note: "Social media" },
  { label: "1080p", note: "HD" },
  { label: "4K", note: "Premium", locked: true },
];

function clipchampChrome(x, y, w, h) {
  const sidebarW = 90;
  const topH = 40;
  const pieces = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${CARD}" stroke="${CHROME_DARK}" stroke-width="1" />`,
    // Top bar
    `<rect x="${x}" y="${y}" width="${w}" height="${topH}" fill="#F4F6F9" />`,
    `<line x1="${x}" y1="${y + topH}" x2="${x + w}" y2="${y + topH}" stroke="${CHROME_DARK}" stroke-width="1" />`,
    text(x + 16, y + topH / 2 + 4, "Untitled video", { size: 13, weight: 600 }),
    // Sidebar
    `<rect x="${x}" y="${y + topH}" width="${sidebarW}" height="${h - topH}" fill="${PAPER}" />`,
    `<line x1="${x + sidebarW}" y1="${y + topH}" x2="${x + sidebarW}" y2="${y + h}" stroke="${CHROME_DARK}" stroke-width="1" />`,
  ];
  CLIPCHAMP_TABS.forEach((tab, i) => {
    const ty = y + topH + 18 + i * 24;
    pieces.push(text(x + 10, ty, tab, { size: 9.5, fill: i === 0 ? INK : MUTED, weight: i === 0 ? 700 : 400 }));
  });
  return { svg: pieces.join("\n  "), sidebarW, topH, exportBtn: { x: x + w - 92, y: y + 6, w: 76, h: topH - 12 } };
}

function clipchampExportButton(x, y, w, h, { highlight = false } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${highlight ? "none" : INK}" stroke="${highlight ? ANNOTATION : "none"}" stroke-width="${highlight ? 2 : 0}" />
  ${text(x + w / 2, y + h / 2 + 4, "Export", { size: 12.5, weight: 700, fill: highlight ? ANNOTATION : "#FFFFFF", anchor: "middle" })}`;
}

/** A timeline clip row with real trim handles at both edges (support.microsoft.com/.../how-to-trim-videos... : drag right to lengthen, left to shorten). `dragging`, if set ("left"|"right"), draws that handle in the annotation color. */
function clipRow(x, y, w, h, clipCount, activeIndex, { dragging = null, waveform = false } = {}) {
  const gap = 6;
  const clipW = (w - gap * (clipCount - 1)) / clipCount;
  const pieces = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${PAPER}" stroke="${CHROME_DARK}" stroke-width="1" />`];
  for (let i = 0; i < clipCount; i++) {
    const cx = x + i * (clipW + gap);
    const active = i === activeIndex;
    const fill = waveform ? PAPER : active ? "#FFFFFF" : CHROME;
    pieces.push(`<rect x="${cx}" y="${y + 4}" width="${clipW}" height="${h - 8}" rx="4" fill="${fill}" stroke="${active ? ANNOTATION : CHROME_DARK}" stroke-width="${active ? 2.5 : 1.5}" />`);
    if (waveform) {
      // Grayscale, matching this illustration set's black-and-white line-art
      // palette -- not the color of any real app's waveform (iMovie's own
      // is blue, per Apple's docs; Clipchamp's isn't documented either way),
      // since introducing a one-off hue here would be the only non-annotation
      // color in the entire set.
      let wx = cx + 8;
      while (wx < cx + clipW - 8) {
        const barH = 4 + Math.abs(Math.sin(wx * 0.5)) * (h - 20);
        pieces.push(`<line x1="${wx}" y1="${y + h / 2 - barH / 2}" x2="${wx}" y2="${y + h / 2 + barH / 2}" stroke="${MUTED}" stroke-width="2" />`);
        wx += 5;
      }
    } else {
      for (let k = 1; k < 4; k++) {
        pieces.push(`<line x1="${cx + (clipW * k) / 4}" y1="${y + 8}" x2="${cx + (clipW * k) / 4}" y2="${y + h - 8}" stroke="${CHROME_DARK}" stroke-width="1" opacity="0.6" />`);
      }
    }
    if (active && dragging) {
      const hx = dragging === "left" ? cx : cx + clipW;
      pieces.push(`<rect x="${hx - 3}" y="${y + 2}" width="6" height="${h - 4}" rx="3" fill="${ANNOTATION}" />`);
    }
  }
  return pieces.join("\n  ");
}

// ---------------------------------------------------------------------------
// Marker dispatch -- matches a marker's own description text against the
// specific, real-content scenes above. Falls through to the old generic
// widgets (buildScene, further below) for anything not recognized here,
// so a future marker phrased differently than these 41 degrades to the
// previous behavior rather than breaking.
// ---------------------------------------------------------------------------

/**
 * Builds one macOS scene. Returns { appName, menuItems, windowTitle,
 * sidebar, contentBuilder(rect) } where contentBuilder draws whatever
 * sits inside the window below the titlebar (the video canvas, the photo
 * grid, the timeline) and returns { pieces, target } like the old
 * buildScene did.
 */
function macScene(description) {
  const d = description.toLowerCase();

  // --- QuickTime Player: File menu / Export As submenu / Format choice ---
  if (/export as.*(4k|1080p|720p|480p)|resolution (option )?selected|resolution submenu/.test(d) && !/format/.test(d)) {
    return {
      appName: "QuickTime Player",
      menuItems: ["File", "Edit", "View", "Window", "Share", "Help"],
      windowTitle: "Movie.mov",
      player: true,
      overlay: (fileX) => {
        const menu = dropdownPanel(fileX - 10, MENUBAR_H, quickTimeFileMenuRows("export"));
        // selected: 1 ("1080p") -- the marker text says a resolution is
        // selected, and the article's own copy singles out 1080p as
        // covering most cases, so the checkmark needs to land somewhere,
        // not stay absent (cascadeOptionList defaults to no selection).
        const sub = cascadeOptionList(menu.width + fileX - 10, menu.highlightTop.y - 6, ["4K", "1080p", "720p", "480p"], { selected: 1 });
        return { svg: `${menu.svg}\n  ${sub}`, target: menu.highlightPoint };
      },
    };
  }
  if (/file menu.*export as|export as.*highlighted/.test(d)) {
    return {
      appName: "QuickTime Player",
      menuItems: ["File", "Edit", "View", "Window", "Share", "Help"],
      windowTitle: "Movie.mov",
      player: true,
      overlay: (fileX) => {
        const menu = dropdownPanel(fileX - 10, MENUBAR_H, quickTimeFileMenuRows("export"));
        return { svg: menu.svg, target: menu.highlightPoint };
      },
    };
  }
  if (/format choice|smaller file size|greater compatibility/.test(d)) {
    return {
      appName: "QuickTime Player",
      menuItems: ["File", "Edit", "View", "Window", "Share", "Help"],
      windowTitle: "Movie.mov",
      player: true,
      overlay: () => {
        // The article's own step recommends "Smaller File Size" over
        // "Greater Compatibility" -- highlighting that one reflects what
        // the surrounding text actually says to click, not a guess.
        const x = WIDTH / 2 - 110;
        const y = HEIGHT / 2 - 40;
        const panel = dropdownPanel(x, y, [
          { label: "Smaller File Size (HEVC)", highlight: true },
          { label: "Greater Compatibility (H.264)" },
        ], { width: 260 });
        return { svg: panel.svg, target: panel.highlightPoint };
      },
    };
  }

  // --- macOS Preview: Export dialog / quality slider / Get Info ---
  if (/export dialog.*jpeg|format set to jpeg/.test(d)) {
    return {
      appName: "Preview",
      menuItems: ["File", "Edit", "View", "Tools", "Window", "Help"],
      windowTitle: "image.jpg",
      sidebar: true,
      overlay: () => {
        const dlg = previewExportDialog(WIDTH / 2 - 190, CARD_Y_MAC + TITLEBAR_H + 24, { showQuality: false });
        return { svg: dlg.svg, target: dlg.formatTarget };
      },
    };
  }
  if (/quality slider.*export dialog|jpeg quality slider/.test(d)) {
    return {
      appName: "Preview",
      menuItems: ["File", "Edit", "View", "Tools", "Window", "Help"],
      windowTitle: "image.jpg",
      sidebar: true,
      overlay: () => {
        const dlg = previewExportDialog(WIDTH / 2 - 190, CARD_Y_MAC + TITLEBAR_H + 24, { showQuality: true, quality: 80 });
        return { svg: dlg.svg, target: dlg.qualityTarget };
      },
    };
  }
  if (/get info panel|exported file's size/.test(d)) {
    return {
      appName: "Preview",
      menuItems: ["File", "Edit", "View", "Tools", "Window", "Help"],
      windowTitle: "image.jpg",
      sidebar: true,
      overlay: () => {
        const panel = getInfoPanel(WIDTH / 2 - 186, HEIGHT / 2 - 130);
        return { svg: panel.svg, target: panel.sizeTarget };
      },
    };
  }

  // --- macOS Photos: multi-select / File>Create>Slideshow / theme+duration / music / export ---
  if (/selecting multiple photos in the mac photos/.test(d)) {
    return {
      appName: "Photos",
      menuItems: ["File", "Edit", "Image", "View", "Window", "Help"],
      windowTitle: "Photos",
      overlay: () => {
        const gw = 460, gh = 160;
        const gx = WIDTH / 2 - gw / 2, gy = HEIGHT / 2 - gh / 2 - 10;
        return { svg: thumbnailGrid(gx, gy, gw, gh, 4, 2, [0, 1, 2], { style: "mac-tint" }), target: { x: gx + 40, y: gy + 30 } };
      },
    };
  }
  if (/file > create > slideshow/.test(d)) {
    return {
      appName: "Photos",
      menuItems: ["File", "Edit", "Image", "View", "Window", "Help"],
      windowTitle: "Photos",
      overlay: (fileX) => {
        const menu = dropdownPanel(fileX - 10, MENUBAR_H, [
          { label: "New Album…" },
          { label: "New Folder" },
          { divider: true },
          { label: "Import…" },
          { divider: true },
          { label: "Create", submenu: true, highlight: true },
          { label: "Export" },
          { divider: true },
          { label: "Print…" },
        ]);
        const sub = dropdownPanel(menu.width + fileX - 10, menu.highlightTop.y - 6, [
          { label: "Slideshow", highlight: true },
          { label: "Card" },
          { label: "Calendar" },
          { divider: true },
          { label: "Manage…" },
        ], { width: 170 });
        return { svg: `${menu.svg}\n  ${sub.svg}`, target: menu.highlightPoint };
      },
    };
  }
  if (/slideshow theme and duration/.test(d)) {
    return {
      appName: "Photos",
      menuItems: ["File", "Edit", "Image", "View", "Window", "Help"],
      windowTitle: "Slideshow",
      overlay: () => {
        // themeY starts well clear of the titlebar (CARD_Y_MAC + TITLEBAR_H)
        // so the "Themes" heading above the tiles never lands next to the
        // titlebar's own "Slideshow" label.
        const themeW = 460, themeY = CARD_Y_MAC + TITLEBAR_H + 18;
        const pieces = [text(WIDTH / 2, themeY - 8, "Themes", { size: 13, weight: 700, anchor: "middle" })];
        const tileW = 100, tileH = 60, gap = 10;
        PHOTOS_THEMES.slice(0, 4).forEach((themeName, i) => {
          const tx = WIDTH / 2 - themeW / 2 + i * (tileW + gap);
          pieces.push(`<rect x="${tx}" y="${themeY}" width="${tileW}" height="${tileH}" rx="6" fill="${i === 0 ? "#F7D9DC" : PAPER}" stroke="${i === 0 ? ANNOTATION : CHROME_DARK}" stroke-width="${i === 0 ? 2.5 : 1.5}" />`);
          pieces.push(text(tx + tileW / 2, themeY + tileH + 16, themeName, { size: 10.5, anchor: "middle", fill: i === 0 ? ANNOTATION : MUTED, weight: i === 0 ? 700 : 400 }));
        });
        const durY = themeY + tileH + 46;
        // Lay the two duration buttons out by their own measured widths --
        // fixed offsets (WIDTH/2-130 and WIDTH/2+30) don't account for how
        // wide "Duration: Fit to Music" actually renders, and used to
        // overlap the "Custom" button next to it.
        const durLabel = "Duration: Fit to Music";
        const durW = Math.max(96, textWidth(durLabel, 15, "bold") + 36);
        const customW = Math.max(96, textWidth("Custom", 15, "bold") + 36);
        const btnGap = 10;
        const groupX = WIDTH / 2 - (durW + btnGap + customW) / 2;
        pieces.push(button(groupX, durY, durLabel, { filled: false }));
        pieces.push(button(groupX + durW + btnGap, durY, "Custom", { filled: false }));
        return { svg: pieces.join("\n  "), target: { x: WIDTH / 2 - themeW / 2 + tileW / 2, y: themeY + tileH / 2 } };
      },
    };
  }
  if (/music track to the mac slideshow/.test(d)) {
    return {
      appName: "Photos",
      menuItems: ["File", "Edit", "Image", "View", "Window", "Help"],
      windowTitle: "Slideshow",
      overlay: () => {
        const x = WIDTH / 2 - 150, y = HEIGHT / 2 - 60;
        const pieces = [
          `<rect x="${x}" y="${y}" width="300" height="120" rx="8" fill="${CARD}" stroke="${ANNOTATION}" stroke-width="2" />`,
          text(x + 20, y + 28, "Music", { size: 13, weight: 700, fill: ANNOTATION }),
          `<path d="M ${x + 270} ${y + 20} L ${x + 278} ${y + 26} L ${x + 270} ${y + 32}" fill="none" stroke="${ANNOTATION}" stroke-width="1.8" />`,
          text(x + 20, y + 56, "Theme Songs", { size: 12, fill: MUTED }),
          text(x + 20, y + 82, "Music Library", { size: 12, fill: MUTED }),
        ];
        return { svg: pieces.join("\n  "), target: { x: x + 150, y: y + 15 } };
      },
    };
  }
  if (/exporting the finished slideshow/.test(d)) {
    return {
      appName: "Photos",
      menuItems: ["File", "Edit", "Image", "View", "Window", "Help"],
      windowTitle: "Slideshow",
      overlay: () => {
        const x = WIDTH / 2 - 140, y = HEIGHT / 2 - 70;
        const panel = dropdownPanel(x, y, [
          { label: "SD" },
          { label: "720p" },
          { label: "1080p", highlight: true },
        ], { width: 200 });
        return { svg: `${button(x, y - 50, "Export", { filled: true })}\n  ${panel.svg}`, target: panel.highlightPoint };
      },
    };
  }

  // --- iMovie ---
  if (/creating a new movie project/.test(d)) {
    return {
      appName: "iMovie",
      menuItems: ["File", "Edit", "Clip", "Modify", "View", "Window", "Help"],
      windowTitle: "iMovie",
      overlay: () => {
        const x = WIDTH / 2 - 130, y = HEIGHT / 2 - 55;
        const movieBtnW = Math.max(96, textWidth("Movie", 15, "bold") + 36);
        return {
          svg: `${button(x, y, "Movie", { filled: true })}\n  ${button(x + 130, y, "Trailer", { filled: false })}\n  ${text(WIDTH / 2, y - 20, "Create New", { size: 14, weight: 700, anchor: "middle" })}`,
          // Bottom edge, not the button's center -- centering the dot lands
          // it on top of the "Movie" label text.
          target: { x: x + movieBtnW / 2, y: y + 38 },
        };
      },
    };
  }
  if (/dragging an image onto the imovie timeline/.test(d)) {
    return {
      appName: "iMovie",
      menuItems: ["File", "Edit", "Clip", "Modify", "View", "Window", "Help"],
      windowTitle: "My Movie",
      overlay: (fileX, rect) => {
        const browserW = rect.w * 0.32;
        const browserH = rect.h * 0.55;
        const pieces = [
          `<rect x="${rect.x}" y="${rect.y}" width="${browserW}" height="${browserH}" fill="${PAPER}" stroke="${CHROME_DARK}" stroke-width="1" />`,
          thumbnailGrid(rect.x + 8, rect.y + 8, browserW - 16, browserH - 16, 2, 2, [0]),
          `<rect x="${rect.x + browserW + 10}" y="${rect.y}" width="${rect.w - browserW - 10}" height="${browserH}" fill="#2B2B2B" />`,
          // A dashed line with a solid dot at its end -- the same
          // leader-line convention calloutLabel uses elsewhere, not an
          // arrowhead marker (`marker-end="url(#arrow)"` referenced a
          // <marker> this standalone SVG never defines, so the arrowhead
          // silently never rendered, leaving a bare disconnected-looking
          // dashed line floating in the video preview).
          `<line x1="${rect.x + browserW + 30}" y1="${rect.y + browserH / 2}" x2="${rect.x + rect.w - 40}" y2="${rect.y + browserH / 2 - 10}" stroke="${ANNOTATION}" stroke-width="2" stroke-dasharray="5,4" />
  <circle cx="${rect.x + rect.w - 40}" cy="${rect.y + browserH / 2 - 10}" r="3.5" fill="${ANNOTATION}" />`,
          `<rect x="${rect.x}" y="${rect.y + browserH + 12}" width="${rect.w}" height="${rect.h - browserH - 12}" fill="${CHROME}" stroke="${CHROME_DARK}" stroke-width="1" />`,
          clipRow(rect.x + 8, rect.y + browserH + 20, rect.w - 16, rect.h - browserH - 28, 3, 0),
        ];
        return { svg: pieces.join("\n  "), target: { x: rect.x + browserW - 20, y: rect.y + browserH / 2 } };
      },
    };
  }
  if (/dropping an audio file below the image clip/.test(d)) {
    return {
      appName: "iMovie",
      menuItems: ["File", "Edit", "Clip", "Modify", "View", "Window", "Help"],
      windowTitle: "My Movie",
      overlay: (fileX, rect) => {
        const videoRowH = 44, gap = 6;
        const pieces = [
          clipRow(rect.x + 8, rect.y + 20, rect.w - 16, videoRowH, 1, -1),
          text(rect.x + 8, rect.y + 12, "Video", { size: 11, fill: MUTED }),
          text(rect.x + 8, rect.y + 20 + videoRowH + gap - 4, "Background Music", { size: 11, fill: MUTED }),
          clipRow(rect.x + 8, rect.y + 20 + videoRowH + gap + 8, rect.w - 16, videoRowH, 1, 0, { waveform: true }),
        ];
        return { svg: pieces.join("\n  "), target: { x: rect.x + rect.w / 2, y: rect.y + 20 + videoRowH + gap + 8 + videoRowH / 2 } };
      },
    };
  }
  if (/extending the image clip to cover/.test(d)) {
    return {
      appName: "iMovie",
      menuItems: ["File", "Edit", "Clip", "Modify", "View", "Window", "Help"],
      windowTitle: "My Movie",
      overlay: (fileX, rect) => {
        const videoRowH = 44, gap = 6;
        const pieces = [
          clipRow(rect.x + 8, rect.y + 20, rect.w - 100, videoRowH, 1, 0, { dragging: "right" }),
          text(rect.x + 8, rect.y + 12, "Video (extending)", { size: 11, fill: ANNOTATION, weight: 700 }),
          text(rect.x + 8, rect.y + 20 + videoRowH + gap - 4, "Background Music", { size: 11, fill: MUTED }),
          clipRow(rect.x + 8, rect.y + 20 + videoRowH + gap + 8, rect.w - 16, videoRowH, 1, -1, { waveform: true }),
        ];
        return { svg: pieces.join("\n  "), target: { x: rect.x + rect.w - 100, y: rect.y + 20 + videoRowH / 2 } };
      },
    };
  }
  if (/imovie's share menu/.test(d)) {
    return {
      appName: "iMovie",
      menuItems: ["File", "Edit", "Clip", "Modify", "View", "Window", "Help"],
      windowTitle: "My Movie",
      overlay: () => {
        const x = WIDTH / 2 - 100, y = HEIGHT / 2 - 70;
        const panel = dropdownPanel(x, y, IMOVIE_SHARE_DESTINATIONS.map((d2) => ({ label: d2, highlight: d2 === "File" })), { width: 200 });
        return { svg: panel.svg, target: panel.highlightPoint };
      },
    };
  }

  // --- macOS Screenshot toolbar (handled as a full overlay, not a window) ---
  if (/screenshot toolbar|shift-command-5/.test(d)) return { screenshotToolbar: true };

  return null;
}

/** Same idea as macScene, for Windows apps. */
function windowsScene(description) {
  const d = description.toLowerCase();

  if (/selecting multiple photos in the windows photos/.test(d)) {
    return {
      title: "Photos",
      ribbon: null,
      overlay: (rect) => {
        const gw = 460, gh = 160;
        const gx = rect.x + (rect.w - gw) / 2, gy = rect.y + 10;
        return { pieces: [thumbnailGrid(gx, gy, gw, gh, 4, 2, [0, 1, 2], { style: "win-checkbox" })], target: { x: gx + 40, y: gy + 20 } };
      },
    };
  }
  if (/create a video.*photos app toolbar/.test(d)) {
    return {
      title: "Photos",
      ribbon: null,
      overlay: (rect) => {
        const y = rect.y + 20;
        const btnX = rect.x + 20 + 100;
        const btnLabel = "Create a video";
        const btnW = Math.max(96, textWidth(btnLabel, 15, "bold") + 36);
        const pieces = [
          button(rect.x + 20, y, "Share", { filled: false }),
          button(btnX, y, btnLabel, { filled: true }),
        ];
        // Anchor to the button's bottom edge, not a fixed x guess -- the
        // button's own width depends on its label text (see button()'s own
        // sizing), so a hardcoded offset drifts into the label when the
        // real rendered width differs from what that guess assumed.
        return { pieces, target: { x: btnX + btnW / 2, y: y + 38 } };
      },
    };
  }
  if (/xbox game bar|win\+g/.test(d)) return { gameBar: true };

  // --- Clipchamp scenes ---
  // "stretching the image clip to match the audio track's length" is the
  // one real marker (photos-audio-pdf-to-video.md) that names neither
  // "Clipchamp" nor any of the other alternates below, even though it's a
  // Clipchamp step in context (same article section as the other Clipchamp
  // timeline markers) and clipchampSceneFor already has a case for it --
  // without it here, this marker fell through to the generic Windows Photos
  // ribbon chrome instead.
  if (/clipchamp/.test(d) || /photo clips on the clipchamp|photo clip's duration on the timeline|background music track in clipchamp|audio-plus-image video from clipchamp|stretching the image clip/.test(d)) {
    return { title: "Untitled video — Clipchamp", clipchamp: true, build: clipchampSceneFor(d) };
  }
  return null;
}

function clipchampSceneFor(d) {
  if (/imported into the timeline/.test(d)) {
    return (chrome, rect) => ({
      pieces: [clipRow(rect.x, rect.y + 30, rect.w, 60, 1, 0)],
      target: { x: rect.x + 30, y: rect.y + 60 },
    });
  }
  if (/export button in clipchamp's top toolbar/.test(d)) {
    return (chrome, rect, exportBtn) => ({
      pieces: [clipchampExportButton(exportBtn.x, exportBtn.y, exportBtn.w, exportBtn.h, { highlight: true })],
      target: { x: exportBtn.x + exportBtn.w / 2, y: exportBtn.y + exportBtn.h },
    });
  }
  if (/export resolution options|export panel with 1080p|export panel with resolution/.test(d)) {
    return (chrome, rect) => {
      const x = rect.x + rect.w / 2 - 110;
      const y = rect.y + 20;
      const selectedLabel = /1080p/.test(d) ? "1080p" : "1080p";
      const rows = CLIPCHAMP_RESOLUTIONS.map((r) => ({
        label: r.locked ? `${r.label} (${r.note})` : `${r.label} — ${r.note}`,
        highlight: r.label === selectedLabel,
        lock: !!r.locked,
      }));
      const panel = dropdownPanel(x, y, rows, { width: 220 });
      return { pieces: [panel.svg], target: panel.highlightPoint };
    };
  }
  if (/reordering photo clips/.test(d)) {
    return (chrome, rect) => ({
      pieces: [clipRow(rect.x, rect.y + 30, rect.w, 60, 4, 2, { dragging: "left" })],
      target: { x: rect.x + rect.w * 0.4, y: rect.y + 60 },
    });
  }
  if (/adjusting a photo clip's duration|stretching the image clip/.test(d)) {
    return (chrome, rect) => ({
      pieces: [clipRow(rect.x, rect.y + 30, rect.w, 60, 3, 1, { dragging: "right" })],
      target: { x: rect.x + rect.w * 0.63, y: rect.y + 60 },
    });
  }
  if (/adding a background music track/.test(d)) {
    return (chrome, rect) => ({
      // Video row first, then the "Audio" label sitting in the gap between
      // the two rows, then the audio row -- draw order matters here since
      // an SVG rect drawn after a text element paints over it, and the
      // label used to get painted over by the video row above it.
      pieces: [
        clipRow(rect.x, rect.y + 30, rect.w, 40, 1, -1),
        text(rect.x + 8, rect.y + 82, "Audio", { size: 11, fill: ANNOTATION, weight: 700 }),
        clipRow(rect.x, rect.y + 90, rect.w, 40, 1, 0, { waveform: true }),
      ],
      target: { x: rect.x + 40, y: rect.y + 90 + 40 },
    });
  }
  if (/starting a new blank project/.test(d)) {
    const btnLabel = "Create a new video";
    const btnW = Math.max(96, textWidth(btnLabel, 15, "bold") + 36);
    const btnX = (rect) => rect.x + rect.w / 2 - 90;
    const btnY = (rect) => rect.y + rect.h / 2 - 19;
    return (chrome, rect) => ({
      pieces: [button(btnX(rect), btnY(rect), btnLabel, { filled: true })],
      // Bottom edge of the actual (label-width-dependent) button, not its
      // top -- a target sitting on the button's own edge, above the label
      // text, rather than crossing through it.
      target: { x: btnX(rect) + btnW / 2, y: btnY(rect) + 38 },
    });
  }
  if (/importing an image and an audio file/.test(d)) {
    return (chrome, rect) => ({
      pieces: [
        `<rect x="${rect.x + 20}" y="${rect.y + 10}" width="${rect.w - 40}" height="70" rx="6" fill="${PAPER}" stroke="${ANNOTATION}" stroke-width="2" stroke-dasharray="5,4" />`,
        text(rect.x + rect.w / 2, rect.y + 50, "Import a file", { size: 13, weight: 700, fill: ANNOTATION, anchor: "middle" }),
        text(rect.x + 30, rect.y + 100, "photo.jpg", { size: 11, fill: MUTED }),
        text(rect.x + 130, rect.y + 100, "audio.mp3", { size: 11, fill: MUTED }),
      ],
      // Bottom edge of the dashed drop-zone box (y+10 to y+80), not the
      // "Import a file" label's own baseline at y+50.
      target: { x: rect.x + rect.w / 2, y: rect.y + 80 },
    });
  }
  if (/placing the audio file on clipchamp's audio track/.test(d)) {
    return (chrome, rect) => ({
      pieces: [clipRow(rect.x, rect.y + 30, rect.w, 40, 1, -1), clipRow(rect.x, rect.y + 76, rect.w, 40, 1, 0, { waveform: true })],
      target: { x: rect.x + rect.w / 2, y: rect.y + 96 },
    });
  }
  if (/exporting the finished.*(from clipchamp|clipchamp)/.test(d)) {
    // The finished-export step reuses the same real Export-button highlight
    // as "the Export button in Clipchamp's top toolbar" -- a plain clip row
    // (the fallback below) doesn't actually depict exporting anything.
    return (chrome, rect, exportBtn) => ({
      pieces: [clipchampExportButton(exportBtn.x, exportBtn.y, exportBtn.w, exportBtn.h, { highlight: true })],
      target: { x: exportBtn.x + exportBtn.w / 2, y: exportBtn.y + exportBtn.h },
    });
  }
  return (chrome, rect) => ({ pieces: [clipRow(rect.x, rect.y + 30, rect.w, 60, 1, 0)], target: { x: rect.x + 30, y: rect.y + 60 } });
}

/** Same idea for VLC. */
function vlcScene(description) {
  const d = description.toLowerCase();
  if (/media menu.*convert.save|media menu with convert/.test(d)) {
    // All 12 real Media-menu items (VideoLAN's own documented order) need
    // more vertical room than the small dialog box the other VLC scenes
    // use -- that box is sized for a handful of rows, and this real menu
    // used to spill straight through it, the playback bar, the callout,
    // and the "VLC" caption below. fullMenu tells the caller to lay this
    // one out against the window directly instead of inside that box.
    return { fullMenu: true };
  }
  if (/file added under the file tab|convert\/save dialog with a file/.test(d)) {
    return (rect) => {
      const x = rect.x + (rect.w - 380) / 2, y = rect.y + 10;
      // Highlight just the "File" tab itself, not the whole tab strip --
      // a border around all four tabs doesn't say which one is selected.
      const fileTabW = textWidth("File", 12, "bold") + 16;
      const pieces = [
        `<rect x="${x}" y="${y}" width="380" height="150" rx="8" fill="${PAPER}" stroke="${CHROME_DARK}" stroke-width="1" />`,
        `<rect x="${x + 12}" y="${y + 10}" width="356" height="24" fill="${CARD}" stroke="${CHROME_DARK}" stroke-width="1" />`,
        `<rect x="${x + 14}" y="${y + 11}" width="${fileTabW}" height="22" rx="2" fill="none" stroke="${ANNOTATION}" stroke-width="2" />`,
        text(x + 20, y + 26, "File", { size: 12, weight: 700, fill: ANNOTATION }),
        text(x + 70, y + 26, "Disc", { size: 12, fill: MUTED }),
        text(x + 120, y + 26, "Network", { size: 12, fill: MUTED }),
        text(x + 190, y + 26, "Capture Device", { size: 12, fill: MUTED }),
        `<rect x="${x + 20}" y="${y + 50}" width="340" height="40" rx="4" fill="${CARD}" stroke="${CHROME_DARK}" stroke-width="1" />`,
        text(x + 30, y + 74, "test-video.mp4", { size: 12 }),
        button(x + 20, y + 100, "Add", { filled: false }),
        `<rect x="${x + 260}" y="${y + 106}" width="100" height="30" rx="5" fill="${INK}" />`,
        text(x + 310, y + 126, "Convert / Save", { size: 11, weight: 700, fill: "#FFFFFF", anchor: "middle" }),
      ];
      // Bottom edge of the File tab's own highlight box, not the "Capture
      // Device" label two tabs over.
      return { pieces, target: { x: x + 14 + fileTabW / 2, y: y + 33 } };
    };
  }
  if (/profile dropdown|profile selector/.test(d)) {
    return (rect) => {
      const x = rect.x + (rect.w - 260) / 2, y = rect.y + 10;
      const panel = dropdownPanel(x, y, VLC_PROFILES.map((label) => ({ label, highlight: /H\.264/.test(label) })), { width: 260 });
      return { pieces: [panel.svg], target: panel.highlightPoint };
    };
  }
  if (/destination set and the start button/.test(d)) {
    return (rect) => {
      // Wide enough that the Browse button (sized to its own label, like
      // every other button() call) doesn't spill past the panel's right
      // edge, and tall enough that the Start button sits a clear gap below
      // Browse instead of touching it.
      const dialogW = 410;
      const x = rect.x + (rect.w - dialogW) / 2, y = rect.y + 20;
      const browseY = y + 68;
      const startY = browseY + 38 + 14;
      const startW = 96, startH = 30;
      const startX = x + 16 + 260 - startW;
      const pieces = [
        `<rect x="${x}" y="${y}" width="${dialogW}" height="${startY + startH + 16 - y}" rx="8" fill="${PAPER}" stroke="${CHROME_DARK}" stroke-width="1" />`,
        text(x + 16, y + 24, "Profile:", { size: 12, fill: MUTED }),
        `<rect x="${x + 90}" y="${y + 10}" width="230" height="26" rx="4" fill="${CARD}" stroke="${CHROME_DARK}" stroke-width="1" />`,
        text(x + 100, y + 28, "Video - H.264 + MP3 (MP4)", { size: 10.5 }),
        `<circle cx="${x + 336}" cy="${y + 23}" r="11" fill="none" stroke="${INK}" stroke-width="1.5" />`,
        text(x + 16, y + 60, "Destination:", { size: 12, fill: MUTED }),
        `<rect x="${x + 16}" y="${browseY}" width="260" height="26" rx="4" fill="${CARD}" stroke="${CHROME_DARK}" stroke-width="1" />`,
        text(x + 26, browseY + 18, "output.mp4", { size: 11 }),
        button(x + 292, browseY, "Browse", { filled: false }),
        `<rect x="${startX}" y="${startY}" width="${startW}" height="${startH}" rx="5" fill="none" stroke="${ANNOTATION}" stroke-width="2" />`,
        text(startX + startW / 2, startY + startH / 2 + 5, "Start", { size: 12, weight: 700, fill: ANNOTATION, anchor: "middle" }),
      ];
      return { pieces, target: { x: startX + startW / 2, y: startY + startH } };
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Old generic scene builder -- unchanged, kept as the fallback for any
// marker not recognized by the specific scenes above.
// ---------------------------------------------------------------------------
function extractHighlighted(description) {
  const m = description.match(/([A-Z][\w.&/]*(?:\s+(?:&|[A-Z][\w.&/]*))*)\s+highlighted\b/);
  return m ? m[1].trim() : null;
}
function extractOptionsBetween(description) {
  const m = description.match(/\bbetween\s+([\w-]+(?:\s+[\w-]+){0,2}?)\s+and\s+([\w-]+(?:\s+[\w-]+){0,2}?)(?=[.,]|\s+(?:as|for|to|so|which|that|when|while)\b|$)/i);
  if (!m) return null;
  return [m[1].trim(), m[2].trim()];
}
function extractOptionsShowing(description) {
  const m = description.match(/\bshowing\s+(.+?)\s+options?\b/i);
  if (!m) return null;
  const raw = m[1].replace(/,?\s+and\s+/i, ", ");
  return raw.split(",").map((s) => s.trim().replace(/^(the|a|an)\s+/i, "")).filter(Boolean);
}
function extractPercent(description) {
  const m = description.match(/\b(\d{1,3})\s*%/) || description.match(/\bslider\b.*?\b(\d{1,3})\b/i);
  return m ? Math.max(5, Math.min(100, parseInt(m[1], 10))) : null;
}
const BASIC_RULES = [
  { id: "upload", re: /\b(upload(ing|ed)?|drop(ping|zone)?|drag(ging)?|choose file|select file|browsing|browse|pick(ing)?\s+(a\s+|an\s+|your\s+)?(photo|image|file)s?)\b/i },
  { id: "result", re: /\b(result|finish(ed|ing)?|complete(d)?|download(ed|ing)?|reported size|percent smaller|compressed size|resulting file)\b/i },
  { id: "process", re: /\b(process(ing)?|running|run(s|ning)? the|compress(ing)?|convert(ing)?|progress|loading|working|binary search|click(ing)?\s+(the\s+)?(compress|convert|resize)\b)/i },
];
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
    return { pieces: [clipRow(tx, ty, tw, 48, 4, 1)], target: { x: tx + (tw / 4) * 1.5, y: ty } };
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

// Legacy per-app registries, kept for the generic fallback path only (a
// marker phrased differently than the 41 this revision specifically
// targets) -- see macScene/windowsScene above for the real, sourced
// scenes that now handle every currently-published marker.
const MACOS_APPS = [
  { match: ["quicktime"], title: "Movie.mov", appName: "QuickTime Player", sidebar: false, menu: ["File", "Edit", "View", "Window", "Share", "Help"] },
  { match: ["imovie"], title: "My Movie", appName: "iMovie", sidebar: false, menu: ["File", "Edit", "Clip", "Modify", "View", "Window", "Help"] },
  { match: ["photos app", "mac photos", "photos on mac", "in photos"], title: "Photos", appName: "Photos", sidebar: false, menu: ["File", "Edit", "Image", "View", "Window", "Help"] },
  { match: ["finder", "get info"], title: "Finder", appName: "Finder", sidebar: false, menu: ["File", "Edit", "View", "Go", "Window", "Help"] },
];
const DEFAULT_MACOS_APP = { title: "image.jpg", appName: "Preview", sidebar: true, menu: ["File", "Edit", "View", "Tools", "Window", "Help"] };
function macAppFor(description) {
  const lower = description.toLowerCase();
  for (const app of MACOS_APPS) {
    if (app.match.some((needle) => lower.includes(needle))) return app;
  }
  return DEFAULT_MACOS_APP;
}
const WINDOWS_APPS = [{ match: ["clipchamp"], title: "Untitled video — Clipchamp", ribbon: null }];
const DEFAULT_WINDOWS_APP = { title: "Photos", ribbon: ["Share", "Delete"] };
function winAppFor(description) {
  const lower = description.toLowerCase();
  for (const app of WINDOWS_APPS) {
    if (app.match.some((needle) => lower.includes(needle))) return app;
  }
  return DEFAULT_WINDOWS_APP;
}
function domainFrom(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const p = u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "");
    return `${host}${p}`;
  } catch {
    return null;
  }
}
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
function winRibbon(items) {
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

/** The full-screen Screenshot toolbar overlay (Shift-Cmd-5) -- confirmed layout via Apple Support (support.apple.com/en-us/102646, 102618): 3 capture buttons, a divider, 2 recording buttons (each carrying a small record-circle badge -- SF Symbols "rectangle badge record" / "rectangle dashed badge record"), another divider, Options, then the action button. This is drawn as its own overlay rather than inside a window, since the real toolbar floats over the whole desktop. */
function screenshotToolbarSVG(description) {
  const barW = 420, barH = 56;
  const barX = WIDTH / 2 - barW / 2, barY = HEIGHT - 150;
  const icons = [
    { kind: "screen" }, { kind: "window" }, { kind: "selection" },
    { divider: true },
    { kind: "record-screen" }, { kind: "record-selection" },
    { divider: true },
    { label: "Options" },
    { label: "Capture", button: true },
  ];
  let x = barX + 16;
  const pieces = [
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#DADFE6" opacity="0.5" />`,
    `<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="14" fill="rgba(255,255,255,0.92)" stroke="${CHROME_DARK}" stroke-width="1" />`,
  ];
  const iconY = barY + barH / 2;
  for (const item of icons) {
    if (item.divider) {
      pieces.push(`<line x1="${x + 6}" y1="${barY + 10}" x2="${x + 6}" y2="${barY + barH - 10}" stroke="${CHROME_DARK}" stroke-width="1" />`);
      x += 18;
      continue;
    }
    if (item.button) {
      const w = textWidth(item.label, 13, "bold") + 28;
      pieces.push(`<rect x="${x}" y="${iconY - 15}" width="${w}" height="30" rx="15" fill="${INK}" />`);
      pieces.push(text(x + w / 2, iconY + 4, item.label, { size: 13, weight: 700, fill: "#FFFFFF", anchor: "middle" }));
      x += w + 10;
      continue;
    }
    if (item.label) {
      pieces.push(text(x, iconY + 4, item.label, { size: 13, fill: INK }));
      x += textWidth(item.label, 13) + 20;
      continue;
    }
    const cx = x + 14, cy = iconY;
    const isRecord = item.kind.startsWith("record");
    const strokeColor = isRecord ? ANNOTATION : INK;
    if (item.kind === "screen") pieces.push(`<rect x="${cx - 11}" y="${cy - 8}" width="22" height="16" rx="1.5" fill="none" stroke="${strokeColor}" stroke-width="1.8" />`);
    if (item.kind === "window") pieces.push(`<path d="M ${cx - 9} ${cy - 9} h 6 M ${cx - 9} ${cy - 9} v 6 M ${cx + 9} ${cy + 9} h -6 M ${cx + 9} ${cy + 9} v -6 M ${cx + 9} ${cy - 9} h -6 M ${cx + 9} ${cy - 9} v 6 M ${cx - 9} ${cy + 9} h 6 M ${cx - 9} ${cy + 9} v -6" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" />`);
    if (item.kind === "selection") pieces.push(`<rect x="${cx - 10}" y="${cy - 8}" width="20" height="16" rx="1.5" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-dasharray="3,2" />`);
    if (item.kind === "record-screen") pieces.push(`<rect x="${cx - 11}" y="${cy - 8}" width="22" height="16" rx="1.5" fill="none" stroke="${strokeColor}" stroke-width="1.8" /><circle cx="${cx + 8}" cy="${cy + 6}" r="4.2" fill="${ANNOTATION}" />`);
    if (item.kind === "record-selection") pieces.push(`<rect x="${cx - 10}" y="${cy - 8}" width="20" height="16" rx="1.5" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-dasharray="3,2" /><circle cx="${cx + 8}" cy="${cy + 6}" r="4.2" fill="${ANNOTATION}" />`);
    x += 34;
  }
  const target = { x: barX + 16 + 3 * 34 + 9 + 14, y: iconY };
  pieces.push(calloutLabel(WIDTH / 2, barY - 90, WIDTH - 120, calloutTextFor(description), target));
  pieces.push(text(WIDTH / 2, barY + barH + 40, "macOS", { size: 18, fill: MUTED, anchor: "middle" }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${pieces.join("\n  ")}</svg>`;
}

/** The Xbox Game Bar overlay (Win+G) -- confirmed via Microsoft's own Game Bar page: a main bar top-center, plus a draggable Capture widget (by default upper-left) with a screenshot button, a record button, a "last 30 seconds" clip button, and a mic-mute toggle. Drawn as its own full-screen overlay, same reasoning as the macOS Screenshot toolbar above. */
function gameBarSVG(description) {
  const pieces = [`<rect width="${WIDTH}" height="${HEIGHT}" fill="#1B1B1F" />`];
  // Main top-center bar
  const topW = 260, topH = 40, topX = WIDTH / 2 - topW / 2, topY = 24;
  pieces.push(`<rect x="${topX}" y="${topY}" width="${topW}" height="${topH}" rx="10" fill="rgba(30,30,34,0.92)" stroke="#3A3A3E" stroke-width="1" />`);
  pieces.push(text(topX + topW / 2, topY + topH / 2 + 4, "Xbox Game Bar", { size: 13, weight: 700, fill: "#FFFFFF", anchor: "middle" }));
  // Capture widget, upper-left
  const capX = 60, capY = 90, capW = 260, capH = 100;
  pieces.push(`<rect x="${capX}" y="${capY}" width="${capW}" height="${capH}" rx="10" fill="rgba(30,30,34,0.92)" stroke="#3A3A3E" stroke-width="1" />`);
  pieces.push(text(capX + 16, capY + 22, "Capture", { size: 12, weight: 700, fill: "#FFFFFF" }));
  const btnY = capY + 40;
  pieces.push(`<rect x="${capX + 16}" y="${btnY}" width="36" height="36" rx="8" fill="none" stroke="${ANNOTATION}" stroke-width="2" /><circle cx="${capX + 34}" cy="${btnY + 18}" r="8" fill="${ANNOTATION}" />`);
  pieces.push(`<rect x="${capX + 64}" y="${btnY}" width="36" height="36" rx="8" fill="none" stroke="#8A8A8E" stroke-width="1.6" /><rect x="${capX + 78}" y="${btnY + 14}" width="8" height="8" rx="1.5" fill="none" stroke="#8A8A8E" stroke-width="1.6" />`);
  pieces.push(`<rect x="${capX + 112}" y="${btnY}" width="60" height="36" rx="8" fill="none" stroke="#8A8A8E" stroke-width="1.6" />`, text(capX + 142, btnY + 22, "30s", { size: 11, fill: "#8A8A8E", anchor: "middle" }));
  pieces.push(`<rect x="${capX + 184}" y="${btnY}" width="36" height="36" rx="8" fill="none" stroke="#8A8A8E" stroke-width="1.6" />`);
  const target = { x: capX + 34, y: btnY + 18 };
  pieces.push(calloutLabel(WIDTH / 2, capY + capH + 60, WIDTH - 160, calloutTextFor(description), target));
  pieces.push(text(WIDTH / 2, capY + capH + 122, "Windows", { size: 18, fill: "#B5B5B5", anchor: "middle" }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${pieces.join("\n  ")}</svg>`;
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
    const special = macScene(desc);
    if (special?.screenshotToolbar) return screenshotToolbarSVG(desc);
    if (special) {
      const { appName, menuItems, windowTitle, sidebar, player, overlay } = special;
      const bar = macGlobalMenuBar(appName, menuItems);
      const rect = sidebar
        ? { x: CARD_X + SIDEBAR_W, y: CARD_Y_MAC + TITLEBAR_H, w: CARD_W - SIDEBAR_W, h: CARD_H_MAC - TITLEBAR_H - CALLOUT_BAND_H }
        : { x: CARD_X, y: CARD_Y_MAC + TITLEBAR_H, w: CARD_W, h: CARD_H_MAC - TITLEBAR_H - CALLOUT_BAND_H };
      const fileX = bar.positions.File ?? bar.positions[menuItems[0]];
      const { svg: overlaySvg, target } = overlay(fileX, rect);
      const calloutY = CARD_Y_MAC + CARD_H_MAC - CALLOUT_BAND_H + 6;
      const playerContent = player
        ? `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" fill="#2B2B2B" />
      <circle cx="${rect.x + rect.w / 2}" cy="${rect.y + rect.h / 2 - 14}" r="24" fill="none" stroke="#8A8A8A" stroke-width="2" />
      <path d="M ${rect.x + rect.w / 2 - 7} ${rect.y + rect.h / 2 - 25} L ${rect.x + rect.w / 2 - 7} ${rect.y + rect.h / 2 - 3} L ${rect.x + rect.w / 2 + 11} ${rect.y + rect.h / 2 - 14} Z" fill="#8A8A8A" />`
        : "";
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}" />
  <rect x="${CARD_X}" y="${CARD_Y_MAC}" width="${CARD_W}" height="${CARD_H_MAC}" rx="16" fill="${CARD}" />
  ${windowChrome("mac", false, CARD_Y_MAC, CARD_H_MAC)}
  ${centeredTitlebarLabel(windowTitle, CARD_Y_MAC)}
  ${sidebar ? macSidebar() : ""}
  ${playerContent}
  ${bar.svg}
  ${overlaySvg}
  ${calloutLabel(CARD_X + CARD_W / 2, calloutY, CARD_W - 60, calloutTextFor(desc), target)}
  ${text(WIDTH / 2, CARD_Y_MAC + CARD_H_MAC + 44, "macOS", { size: 20, fill: MUTED, anchor: "middle" })}
</svg>`;
    }
    // Fall through to the old generic macOS rendering for anything not
    // recognized above.
    const app = macAppFor(desc);
    const bar = macGlobalMenuBar(app.appName, app.menu);
    const rect = app.sidebar
      ? { x: CARD_X + SIDEBAR_W, y: CARD_Y_MAC + TITLEBAR_H, w: CARD_W - SIDEBAR_W, h: CARD_H_MAC - TITLEBAR_H - CALLOUT_BAND_H }
      : { x: CARD_X, y: CARD_Y_MAC + TITLEBAR_H, w: CARD_W, h: CARD_H_MAC - TITLEBAR_H - CALLOUT_BAND_H };
    const scene = buildScene(desc, rect);
    const calloutY = CARD_Y_MAC + CARD_H_MAC - CALLOUT_BAND_H + 6;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}" />
  <rect x="${CARD_X}" y="${CARD_Y_MAC}" width="${CARD_W}" height="${CARD_H_MAC}" rx="16" fill="${CARD}" />
  ${windowChrome("mac", false, CARD_Y_MAC, CARD_H_MAC)}
  ${centeredTitlebarLabel(app.title, CARD_Y_MAC)}
  ${app.sidebar ? macSidebar() : ""}
  ${bar.svg}
  ${scene.pieces.join("\n  ")}
  ${calloutLabel(CARD_X + CARD_W / 2, calloutY, CARD_W - 60, calloutTextFor(desc), scene.target)}
  ${text(WIDTH / 2, CARD_Y_MAC + CARD_H_MAC + 44, "macOS", { size: 20, fill: MUTED, anchor: "middle" })}
</svg>`;
  }

  if (toolName === "Windows") {
    const special = windowsScene(desc);
    if (special?.gameBar) return gameBarSVG(desc);
    if (special?.clipchamp) {
      const chromeH = TITLEBAR_H;
      const chrome = clipchampChrome(CARD_X, CARD_Y + chromeH, CARD_W, CARD_H - chromeH - CALLOUT_BAND_H);
      const rect = { x: CARD_X + chrome.sidebarW + 12, y: CARD_Y + chromeH + chrome.topH + 16, w: CARD_W - chrome.sidebarW - 24, h: CARD_H - chromeH - CALLOUT_BAND_H - chrome.topH - 26 };
      const exportBtn = { x: chrome.exportBtn.x, y: CARD_Y + chromeH + chrome.exportBtn.y - (CARD_Y + chromeH), w: chrome.exportBtn.w, h: chrome.exportBtn.h };
      const absExportBtn = { x: chrome.exportBtn.x, y: CARD_Y + chromeH + 6, w: chrome.exportBtn.w, h: chrome.exportBtn.h };
      const { pieces, target } = special.build({ x: CARD_X, topH: chrome.topH }, rect, absExportBtn);
      const calloutY = CARD_Y + CARD_H - CALLOUT_BAND_H + 6;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}" />
  ${windowChrome("win")}
  ${text(CARD_X + 16, CARD_Y + TITLEBAR_H / 2 + 4, special.title, { size: 13, weight: 600 })}
  ${clipchampExportButton(absExportBtn.x, absExportBtn.y, absExportBtn.w, absExportBtn.h)}
  <g transform="translate(0, ${chromeH})">${chrome.svg}</g>
  ${pieces.join("\n  ")}
  ${calloutLabel(CARD_X + CARD_W / 2, calloutY, CARD_W - 60, calloutTextFor(desc), target)}
  ${text(WIDTH / 2, CARD_Y + CARD_H + 44, "Windows", { size: 20, fill: MUTED, anchor: "middle" })}
</svg>`;
    }
    if (special) {
      const { title, ribbon, overlay } = special;
      const chromeH = TITLEBAR_H + (ribbon ? TOOLBAR_H : 0);
      const rect = { x: CARD_X, y: CARD_Y + chromeH, w: CARD_W, h: CARD_H - chromeH - CALLOUT_BAND_H };
      const { pieces, target } = overlay(rect);
      const calloutY = CARD_Y + CARD_H - CALLOUT_BAND_H + 6;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}" />
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="8" fill="${CARD}" />
  ${windowChrome("win")}
  ${text(CARD_X + 16, CARD_Y + TITLEBAR_H / 2 + 4, title, { size: 13, weight: 600 })}
  ${ribbon ? winRibbon(ribbon) : ""}
  ${pieces.join("\n  ")}
  ${calloutLabel(CARD_X + CARD_W / 2, calloutY, CARD_W - 60, calloutTextFor(desc), target)}
  ${text(WIDTH / 2, CARD_Y + CARD_H + 44, "Windows", { size: 20, fill: MUTED, anchor: "middle" })}
</svg>`;
    }
    const app = winAppFor(desc);
    const chromeH = TITLEBAR_H + (app.ribbon ? TOOLBAR_H : 0);
    const rect = { x: CARD_X, y: CARD_Y + chromeH, w: CARD_W, h: CARD_H - chromeH - CALLOUT_BAND_H };
    const scene = buildScene(desc, rect);
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
    const dialogPad = 18;
    const rect = { x: CARD_X + dialogPad, y: CARD_Y + TITLEBAR_H + TOOLBAR_H + dialogPad, w: CARD_W - dialogPad * 2, h: CARD_H - TITLEBAR_H - TOOLBAR_H - PLAYBAR_H - dialogPad * 2 - CALLOUT_BAND_H };
    const specialBuilder = vlcScene(desc);
    if (specialBuilder?.fullMenu) {
      // The real 12-item Media menu, drawn as its own dropdown straight off
      // the menu bar (like the macOS dropdowns do) instead of squeezed into
      // the small dialog box the other VLC scenes share -- see vlcScene's
      // own comment for why.
      const menuTop = CARD_Y + TITLEBAR_H + TOOLBAR_H - 4;
      // A slightly tighter row height than the usual dropdown -- at the
      // default 25px, all 12 real rows plus the panel's own shadow would
      // reach almost exactly the window's bottom edge, leaving no margin.
      const panel = dropdownPanel(CARD_X + 16, menuTop, VLC_MEDIA_MENU.map((label) => ({ label, highlight: label === "Convert / Save…" })), { width: 260, rowH: 22 });
      const calloutY = menuTop + panel.height + 10;
      // A taller window card than the other VLC scenes use -- just enough
      // extra room for the full menu plus a callout band below it, still
      // comfortably inside the 540-tall canvas with the "VLC" caption
      // beneath it.
      const menuCardH = calloutY - CARD_Y + 68;
      const menuCardBottom = CARD_Y + menuCardH;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#141414" />
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${menuCardH}" rx="8" fill="#1E1E1E" />
  ${windowChrome("win", true)}
  <path d="M ${CARD_X + 16} ${CARD_Y + TITLEBAR_H / 2 - 7} L ${CARD_X + 28} ${CARD_Y + TITLEBAR_H / 2 + 7} L ${CARD_X + 4} ${CARD_Y + TITLEBAR_H / 2 + 7} Z" fill="#EDEDED" />
  ${text(CARD_X + 36, CARD_Y + TITLEBAR_H / 2 + 4, "VLC media player", { size: 13, weight: 600, fill: "#EDEDED" })}
  ${menuBar(["Media", "Playback", "Audio", "Video", "Subtitle", "Tools", "View", "Help"], { dark: true })}
  ${panel.svg}
  ${calloutLabel(CARD_X + CARD_W / 2, calloutY, CARD_W - dialogPad * 2 - 40, calloutTextFor(desc), panel.highlightPoint)}
  ${text(WIDTH / 2, menuCardBottom + 30, "VLC", { size: 20, fill: MUTED, anchor: "middle" })}
</svg>`;
    }
    const scene = specialBuilder ? specialBuilder(rect) : buildScene(desc, rect);
    const calloutY = rect.y + rect.h - CALLOUT_BAND_H + CALLOUT_BAND_H + 6;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#141414" />
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="8" fill="#1E1E1E" />
  ${windowChrome("win", true)}
  <path d="M ${CARD_X + 16} ${CARD_Y + TITLEBAR_H / 2 - 7} L ${CARD_X + 28} ${CARD_Y + TITLEBAR_H / 2 + 7} L ${CARD_X + 4} ${CARD_Y + TITLEBAR_H / 2 + 7} Z" fill="#EDEDED" />
  ${text(CARD_X + 36, CARD_Y + TITLEBAR_H / 2 + 4, "VLC media player", { size: 13, weight: 600, fill: "#EDEDED" })}
  ${menuBar(["Media", "Playback", "Audio", "Video", "Subtitle", "Tools", "View", "Help"], { dark: true })}
  <rect x="${CARD_X + dialogPad}" y="${CARD_Y + TITLEBAR_H + TOOLBAR_H + dialogPad}" width="${CARD_W - dialogPad * 2}" height="${CARD_H - TITLEBAR_H - TOOLBAR_H - PLAYBAR_H - dialogPad * 2}" rx="8" fill="${PAPER}" stroke="${CHROME_DARK}" stroke-width="1" />
  ${scene.pieces.join("\n  ")}
  ${calloutLabel(CARD_X + CARD_W / 2, rect.y + rect.h + 6, CARD_W - dialogPad * 2 - 40, calloutTextFor(desc), scene.target)}
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
  const rect = { x: CARD_X, y: CARD_Y + chromeH, w: CARD_W, h: CARD_H - chromeH - CALLOUT_BAND_H };
  const scene = buildScene(desc, rect);
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

/** Preview.app's own signature convention: a narrow thumbnail rail down the left edge. */
function macSidebar() {
  const top = CARD_Y_MAC + TITLEBAR_H;
  const thumbW = 24;
  const thumbH = 32;
  const gap = 10;
  const startY = top + 12;
  const rects = [0, 1, 2].map((i) => {
    const y = startY + i * (thumbH + gap);
    return `<rect x="${CARD_X + (SIDEBAR_W - thumbW) / 2}" y="${y}" width="${thumbW}" height="${thumbH}" rx="3" fill="${i === 0 ? CHROME_DARK : CHROME}" stroke="${INK}" stroke-width="1" />`;
  });
  return `<rect x="${CARD_X}" y="${top}" width="${SIDEBAR_W}" height="${CARD_Y_MAC + CARD_H_MAC - top}" fill="${PAPER}" />
  ${rects.join("\n  ")}
  <path d="M ${CARD_X + SIDEBAR_W} ${top} L ${CARD_X + SIDEBAR_W} ${CARD_Y_MAC + CARD_H_MAC}" stroke="${CHROME_DARK}" stroke-width="1" />`;
}

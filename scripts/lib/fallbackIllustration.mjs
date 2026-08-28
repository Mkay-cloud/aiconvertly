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
 * Draws one abstract "app window" card: a window-chrome background, a
 * colored accent bar, a centered content card with a generic
 * upload-style glyph, a couple of line placeholders, and a pill button --
 * all plain geometry, deliberately not shaped like any real product's
 * actual layout. `toolName` is set as plain text below the card (in the
 * site's own generic sans-serif, not any brand's real logotype/font) so
 * a reader can tell what it's standing in for -- identification, not an
 * imitation of the brand's own wordmark styling.
 */
export function renderFallbackIllustrationSVG(toolName) {
  const style = styleForTool(toolName);
  const label = escapeXml(toolName);
  const cardX = 140;
  const cardY = 110;
  const cardW = WIDTH - cardX * 2;
  const cardH = 300;
  const iconCx = cardX + 90;
  const iconCy = cardY + cardH / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${style.chrome}" />
  <rect x="0" y="0" width="${WIDTH}" height="10" fill="${style.accent}" />
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="20" fill="${style.card}" stroke="${style.chrome}" stroke-width="2" />
  <circle cx="${iconCx}" cy="${iconCy}" r="34" fill="none" stroke="${style.accent}" stroke-width="6" />
  <path d="M ${iconCx} ${iconCy + 14} L ${iconCx} ${iconCy - 14} M ${iconCx - 14} ${iconCy - 2} L ${iconCx} ${iconCy - 16} L ${iconCx + 14} ${iconCy - 2}" fill="none" stroke="${style.accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
  <rect x="${iconCx + 70}" y="${iconCy - 38}" width="${cardW - (iconCx + 70 - cardX) - 40}" height="14" rx="7" fill="${style.chrome}" />
  <rect x="${iconCx + 70}" y="${iconCy - 10}" width="${(cardW - (iconCx + 70 - cardX) - 40) * 0.7}" height="14" rx="7" fill="${style.chrome}" />
  <rect x="${iconCx + 70}" y="${iconCy + 24}" width="150" height="36" rx="18" fill="${style.accent}" />
  <text x="${WIDTH / 2}" y="${cardY + cardH + 56}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="24" fill="${style.ink}">${label}</text>
</svg>`;
}

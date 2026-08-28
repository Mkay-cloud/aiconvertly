/**
 * Genuinely researches a tool's real brand/UI color by visiting its
 * actual site and reading real signals off the live page -- never a
 * guess, never invented. Two signals, checked in order:
 *   1. `<meta name="theme-color">` -- a site's own explicit declaration
 *      of its brand color (browsers use it to tint the address bar /
 *      PWA chrome), when present the strongest and most direct signal
 *      available.
 *   2. The most common non-neutral background color among visually
 *      prominent elements (buttons, button-styled links) -- literally
 *      "from its primary buttons," per how a reader would actually
 *      recognize the tool.
 * Returns a lowercase "#rrggbb" string, or null if the site couldn't be
 * reached, didn't load correctly, or neither signal turned up a real
 * (non-gray/white/black) color. null is the honest, expected outcome
 * for a site this run's environment can't reach -- see
 * capture-screenshots.mjs's own comment on why that's not treated as a
 * failure of this function.
 */

const RESEARCH_TIMEOUT_MS = 12000;

export async function researchToolColor(browser, url) {
  const page = await browser.newPage();
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: RESEARCH_TIMEOUT_MS });
    if (!response || !response.ok()) return null;
    await page.waitForTimeout(400);
    return await page.evaluate(() => {
      function parseColor(raw) {
        if (!raw) return null;
        const value = raw.trim();
        const rgbMatch = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)$/i);
        if (rgbMatch) {
          const [, r, g, b, a] = rgbMatch;
          if (a !== undefined && Number(a) < 0.5) return null;
          return (
            "#" +
            [r, g, b]
              .map((c) => Number(c).toString(16).padStart(2, "0"))
              .join("")
              .toLowerCase()
          );
        }
        if (/^#([0-9a-f]{6})$/i.test(value)) return value.toLowerCase();
        if (/^#([0-9a-f]{3})$/i.test(value)) {
          return (
            "#" +
            [...value.slice(1)]
              .map((c) => c + c)
              .join("")
              .toLowerCase()
          );
        }
        // A named CSS color ("indigo", "tomato", ...) -- normalize via a
        // throwaway canvas, the standard trick for resolving any valid
        // CSS color string down to its rgb() value.
        const ctx = document.createElement("canvas").getContext("2d");
        if (!ctx) return null;
        ctx.fillStyle = "#000000";
        ctx.fillStyle = value;
        return /^#([0-9a-f]{6})$/i.test(ctx.fillStyle) ? ctx.fillStyle.toLowerCase() : null;
      }

      function isNeutral(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        // Low spread between channels reads as gray/white/black/near-black
        // regardless of brightness -- not a real "brand color."
        return Math.max(r, g, b) - Math.min(r, g, b) < 14;
      }

      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      const themeColor = parseColor(themeColorMeta?.getAttribute("content") ?? "");
      if (themeColor && !isNeutral(themeColor)) return themeColor;

      const candidates = Array.from(document.querySelectorAll('button, a[class], [role="button"], input[type="submit"]')).slice(0, 60);
      const counts = new Map();
      for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        if (rect.width < 40 || rect.height < 18 || rect.top > window.innerHeight * 2) continue;
        const bg = parseColor(getComputedStyle(el).backgroundColor);
        if (!bg || isNeutral(bg)) continue;
        counts.set(bg, (counts.get(bg) ?? 0) + 1);
      }
      let best = null;
      let bestCount = 0;
      for (const [hex, count] of counts) {
        if (count > bestCount) {
          best = hex;
          bestCount = count;
        }
      }
      return best;
    });
  } catch {
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

export type Theme = "light" | "dark";

// Shared between the no-flash blocking script in the root layout (which
// interpolates it into a raw inline <script>, since that script can't
// import this module -- it must run before any JS bundle loads) and
// ThemeToggle's own reads/writes, so both sides always agree on the same
// key without duplicating the literal string.
export const THEME_STORAGE_KEY = "theme";

/** The visitor's OS-level preference right now -- "dark" by default (matches this site's own default look) when neither matchMedia nor window exists (SSR). */
export function getSystemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** The visitor's own explicit choice, if they've ever manually toggled -- null means "still following system preference." */
export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    // Storage can throw in a locked-down environment (private browsing
    // with storage disabled, etc.) -- treat exactly like "never chosen."
    return null;
  }
}

export function setStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Non-fatal: the toggle still applies to the current page/tab via
    // applyTheme below, it just won't survive a reload in this browser.
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * The exact logic the no-flash blocking script (src/app/layout.tsx) runs
 * inline before first paint, expressed here once as a plain string so it
 * stays in sync with THEME_STORAGE_KEY without hand-duplicating the key
 * literal in two places. Deliberately minimal and self-contained (no
 * references to anything outside this string) since it has to run raw,
 * synchronously, before any script bundle is available.
 */
export function themeInitScript(): string {
  return `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var t=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;
}

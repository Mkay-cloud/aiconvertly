"use client";

import { useEffect } from "react";
import { applyTheme, getStoredTheme, getSystemTheme, setStoredTheme, type Theme } from "@/lib/theme";

/**
 * A visible light/dark toggle. Deliberately holds no React state for the
 * *current* theme -- the root layout's blocking inline script already
 * sets data-theme on <html> before this component ever mounts, so the
 * correct icon is picked by pure CSS (:root[data-theme=...] rules below,
 * in globals.css) reacting to that attribute, not by JS re-rendering.
 * That sidesteps the usual dark-mode-toggle hydration problem entirely:
 * server and client render the identical markup (both icons present,
 * one hidden by CSS), so there's nothing for React to mismatch on.
 *
 * The click handler and the live system-preference listener below read
 * document.documentElement directly rather than mirroring it into state,
 * for the same reason -- the DOM attribute is always the single source
 * of truth.
 */
export function ThemeToggle() {
  useEffect(() => {
    // "Before any manual choice, keep following system preference live":
    // only take over from the OS setting once the visitor has actually
    // clicked the toggle (a real stored choice in localStorage). Until
    // then, an OS-level theme change while the tab is open should be
    // reflected immediately, not just on the next full page load.
    const media = window.matchMedia("(prefers-color-scheme: light)");
    function handleSystemChange() {
      if (getStoredTheme()) return; // a manual choice already overrides system preference
      applyTheme(getSystemTheme());
    }
    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  }, []);

  function toggle() {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next: Theme = current === "light" ? "dark" : "light";
    applyTheme(next);
    setStoredTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-card hover:text-foreground"
    >
      {/* Sun: shown in dark mode (click to switch to light) */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="theme-icon-sun h-[18px] w-[18px]"
      >
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M12 2.5v2.25M12 19.25v2.25M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.5 12h2.25M19.25 12h2.25M4.4 19.6 6 18M18 6l1.6-1.6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
      {/* Moon: shown in light mode (click to switch to dark) */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="theme-icon-moon h-[18px] w-[18px]"
      >
        <path
          d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

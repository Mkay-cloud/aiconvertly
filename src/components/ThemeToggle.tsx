"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  hasSeenToggleCoachmark,
  markToggleCoachmarkSeen,
  setStoredTheme,
  type Theme,
} from "@/lib/theme";

// How long the coachmark stays up before dismissing itself if the visitor
// never touches it -- "lightweight and non-blocking" means it shouldn't
// linger forever waiting for an explicit close.
const COACHMARK_AUTO_DISMISS_MS = 6000;

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
  // Unlike the theme itself, whether the coachmark should show up *is*
  // real React state -- it only matters for one render, doesn't affect
  // page-wide styling, and (unlike data-theme) both server and initial
  // client render always start at false, so there's no hydration mismatch
  // to avoid here.
  const [showCoachmark, setShowCoachmark] = useState(false);

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

  useEffect(() => {
    if (hasSeenToggleCoachmark()) return;
    // Marked as seen the moment it's decided the coachmark WILL show, not
    // only on explicit dismissal -- "never show it again after being
    // dismissed or after one appearance" means the appearance itself is
    // what counts, so a visitor who ignores it (navigates away, closes
    // the tab) still never sees it a second time.
    markToggleCoachmarkSeen();
    // Reading localStorage (an external system unavailable during SSR) on
    // mount and reflecting it into state is exactly the sanctioned case
    // for this pattern, not the cascading-render setState-in-effect this
    // lint rule usually catches -- a lazy useState initializer can't
    // substitute here, since it would run during hydration too and make
    // the coachmark's very presence in the DOM disagree between server and
    // client (a real structural mismatch, not just an attribute one).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowCoachmark(true);
    const timer = window.setTimeout(() => setShowCoachmark(false), COACHMARK_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, []);

  function toggle() {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next: Theme = current === "light" ? "dark" : "light";
    applyTheme(next);
    setStoredTheme(next);
    setShowCoachmark(false);
  }

  return (
    <div className="relative">
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

      {showCoachmark && (
        <div
          role="status"
          className="absolute right-0 top-full z-20 mt-3 w-52 rounded-xl border border-card-border bg-card p-3 text-left shadow-card"
        >
          {/* Small pointer triangle aiming back up at the toggle button. */}
          <div
            aria-hidden
            className="absolute -top-[7px] right-3 h-3 w-3 rotate-45 border-l border-t border-card-border bg-card"
          />
          <p className="pr-4 text-xs leading-relaxed text-foreground">
            <span className="font-semibold">New:</span> switch between light and dark mode here.
          </p>
          <button
            type="button"
            onClick={() => setShowCoachmark(false)}
            aria-label="Dismiss"
            className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-secondary transition-colors hover:bg-bg hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-3 w-3">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * red-* is Tailwind's fixed palette, not one of this site's own
 * light/dark-swapping --color-* tokens, so it needs its own explicit
 * dark: variant here: text-red-300 (tuned for this site's dark
 * background) measures ~1.6:1 contrast against the pale red-tinted
 * background this renders on in light mode -- text-red-700 keeps a
 * real ~5:1 in light mode while dark: text-red-300 keeps the original
 * dark-mode look unchanged.
 */
export function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      {children}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

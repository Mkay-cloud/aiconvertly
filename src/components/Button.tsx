import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]";

const variants = {
  // shadow-interactive (a token, not a hardcoded per-component shadow
  // value) is reserved for genuinely interactive elements like this one --
  // see globals.css's own comment on --shadow-interactive for why it's
  // never used on a static card.
  primary: "bg-accent text-accent-foreground hover:scale-[1.02] hover:shadow-interactive",
  secondary:
    "border border-card-border bg-card text-foreground hover:border-accent/50 hover:text-accent",
  ghost: "text-secondary hover:text-foreground",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

type CommonProps = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: CommonProps & { href: string }) {
  return (
    <Link
      href={href}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </Link>
  );
}

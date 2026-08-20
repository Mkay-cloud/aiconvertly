import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`font-display text-xl font-bold tracking-tight ${className}`}
    >
      <span className="text-accent">AI</span>{" "}
      <span className="text-foreground">convertly</span>
    </Link>
  );
}

import Link from "next/link";
import { Container } from "./Container";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-card-border/60 bg-bg/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-6">
          <Link
            href="/#tools"
            className="hidden text-sm font-medium text-secondary transition-colors hover:text-foreground sm:block"
          >
            Tools
          </Link>
          <Link
            href="/#tools"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Get started
          </Link>
        </nav>
      </Container>
    </header>
  );
}

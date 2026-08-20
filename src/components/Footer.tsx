import Link from "next/link";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { tools } from "@/lib/tools";

export function Footer() {
  return (
    <footer className="border-t border-card-border/60">
      <Container className="flex flex-col gap-10 py-12 sm:flex-row sm:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <Logo />
          <p className="text-sm leading-relaxed text-secondary">
            Free file conversion tools that run entirely in your browser.
            Nothing you upload ever leaves your device.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-3 sm:flex sm:gap-16">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-foreground">
              Tools
            </span>
            <ul className="flex flex-col gap-2">
              {tools.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={`/tools/${tool.slug}`}
                    className="text-sm text-secondary transition-colors hover:text-foreground"
                  >
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
      <Container className="flex flex-col gap-2 border-t border-card-border/60 py-6 text-xs text-secondary sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} AI convertly. All rights reserved.</p>
        <p>Built for speed and privacy — everything runs client-side.</p>
      </Container>
    </footer>
  );
}

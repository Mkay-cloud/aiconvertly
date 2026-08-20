import Link from "next/link";
import { Container } from "./Container";

export function ToolPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-20">
      <div className="flex flex-col gap-4">
        <Link
          href="/#tools"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-secondary transition-colors hover:text-foreground"
        >
          <span aria-hidden>&larr;</span> All tools
        </Link>
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-secondary">
          {description}
        </p>
      </div>
      {children}
    </Container>
  );
}

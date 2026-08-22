import Link from "next/link";
import type { Tool } from "@/lib/tools";
import { toolSoftwareApplicationSchema } from "@/lib/structuredData";
import { Container } from "./Container";
import { JsonLd } from "./JsonLd";

export function ToolPageShell({
  tool,
  children,
}: {
  tool: Tool;
  children: React.ReactNode;
}) {
  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-20">
      <JsonLd data={toolSoftwareApplicationSchema(tool)} />
      <div className="flex flex-col gap-4">
        <Link
          href="/#tools"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-secondary transition-colors hover:text-foreground"
        >
          <span aria-hidden>&larr;</span> All tools
        </Link>
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {tool.name}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-secondary">
          {tool.description}
        </p>
      </div>
      {children}
    </Container>
  );
}

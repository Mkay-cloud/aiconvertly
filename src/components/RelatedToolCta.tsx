import type { Tool } from "@/lib/tools";
import { ButtonLink } from "./Button";

/**
 * The end-of-article call-to-action every blog post with a `relatedTool`
 * gets -- this is the whole point of the content strategy: articles exist
 * to funnel readers toward an actual tool, not to dead-end.
 */
export function RelatedToolCta({ tool }: { tool: Tool }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-card-border bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">
          Try it yourself
        </span>
        <h3 className="font-display text-lg font-semibold text-foreground">{tool.name}</h3>
        <p className="text-sm leading-relaxed text-secondary">{tool.shortDescription}</p>
      </div>
      <ButtonLink href={`/tools/${tool.slug}`} className="shrink-0 whitespace-nowrap">
        Open {tool.name} &rarr;
      </ButtonLink>
    </div>
  );
}

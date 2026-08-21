import Link from "next/link";
import { Container } from "./Container";
import { getTool } from "@/lib/tools";
import { imageFormatList } from "@/lib/imageFormats";
import { commonConversions } from "@/lib/commonConversions";

const pdfToolSlugs = ["merge-pdf", "split-pdf", "rotate-pdf", "pdf-to-jpg", "jpg-to-pdf"];
const imageToolSlugs = [
  "heic-to-jpg",
  "webp-to-png",
  "jpg-png-converter",
  "image-converter",
  "image-resizer",
  "image-compressor",
  "remove-exif-data",
];

const imageFormatBadges = [...imageFormatList.map((f) => f.label), "HEIC"];

function CategoryCard({
  title,
  description,
  formats,
  toolSlugs,
}: {
  title: string;
  description: string;
  formats?: string[];
  toolSlugs: string[];
}) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-6">
      <div>
        <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-secondary">{description}</p>
      </div>

      {formats && (
        <div className="flex flex-wrap gap-1.5">
          {formats.map((format) => (
            <span
              key={format}
              className="rounded-full border border-card-border bg-bg px-2.5 py-1 text-xs font-medium text-secondary"
            >
              {format}
            </span>
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-2.5">
        {toolSlugs.map((slug) => {
          const tool = getTool(slug);
          if (!tool) return null;
          return (
            <li key={slug}>
              <Link
                href={`/tools/${slug}`}
                className="group flex items-center justify-between gap-3 text-sm text-secondary transition-colors hover:text-foreground"
              >
                <span>
                  <span className="font-medium text-foreground">{tool.name}</span>
                  <span className="hidden sm:inline"> — {tool.shortDescription}</span>
                </span>
                <span
                  aria-hidden
                  className="shrink-0 text-accent opacity-0 transition-opacity group-hover:opacity-100"
                >
                  &rarr;
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FormatCatalog() {
  return (
    <section id="formats" className="border-t border-card-border/60 py-20 sm:py-24">
      <Container className="flex flex-col gap-12">
        <div className="flex flex-col gap-4 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Every format, one place
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-secondary">
            Browse by category, or jump straight to a common conversion below.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CategoryCard
            title="PDF"
            description="Merge, split, rotate, and convert PDF documents."
            toolSlugs={pdfToolSlugs}
          />
          <CategoryCard
            title="Images"
            description="Convert, resize, compress, and clean up photos and graphics."
            formats={imageFormatBadges}
            toolSlugs={imageToolSlugs}
          />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-center font-display text-sm font-semibold uppercase tracking-wide text-secondary">
            Common conversions
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {commonConversions.map((conversion) => (
              <Link
                key={conversion.label}
                href={`/tools/${conversion.slug}`}
                className="rounded-full border border-card-border bg-card px-4 py-2 text-sm font-medium text-secondary transition-colors hover:border-accent/40 hover:text-accent"
              >
                {conversion.label}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

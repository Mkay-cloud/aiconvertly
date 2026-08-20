import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolPageShell } from "@/components/ToolPageShell";
import { MergePdfClient } from "./MergePdfClient";

const tool = getTool("merge-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.metaDescription,
  alternates: { canonical: `/tools/${tool.slug}` },
  openGraph: {
    title: `${tool.name} | AI convertly`,
    description: tool.metaDescription,
    url: `/tools/${tool.slug}`,
  },
};

export default function Page() {
  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <MergePdfClient />
    </ToolPageShell>
  );
}

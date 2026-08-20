export type Tool = {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  metaDescription: string;
};

export const tools: Tool[] = [
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    shortDescription: "Combine multiple PDFs into a single file, in any order.",
    description:
      "Combine multiple PDF files into one document. Drag to reorder, then merge — everything happens in your browser.",
    metaDescription:
      "Merge multiple PDF files into one document for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    shortDescription: "Pull out page ranges or break a PDF into single pages.",
    description:
      "Extract a page range or split every page of a PDF into its own file — no uploads, all in your browser.",
    metaDescription:
      "Split a PDF into separate files or extract specific page ranges for free. Runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "rotate-pdf",
    name: "Rotate PDF",
    shortDescription: "Fix sideways or upside-down pages in seconds.",
    description:
      "Rotate all or selected pages in a PDF by 90, 180, or 270 degrees — processed locally in your browser.",
    metaDescription:
      "Rotate PDF pages 90, 180, or 270 degrees for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "pdf-to-jpg",
    name: "PDF to JPG",
    shortDescription: "Turn every page of a PDF into a downloadable image.",
    description:
      "Convert each page of a PDF into a high-quality JPG image, ready to download individually or all at once.",
    metaDescription:
      "Convert PDF pages to JPG images for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "jpg-to-pdf",
    name: "JPG to PDF",
    shortDescription: "Combine images into a single, shareable PDF.",
    description:
      "Combine one or more JPG or PNG images into a single PDF document — reorder pages before you export.",
    metaDescription:
      "Convert JPG or PNG images to PDF for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}

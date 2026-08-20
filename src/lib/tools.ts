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
  {
    slug: "heic-to-jpg",
    name: "HEIC to JPG",
    shortDescription: "Convert iPhone photos to JPG that opens everywhere.",
    description:
      "Convert HEIC and HEIF photos from your iPhone into standard JPG images — decoded and re-encoded entirely in your browser.",
    metaDescription:
      "Convert HEIC or HEIF iPhone photos to JPG for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "webp-to-png",
    name: "WebP to PNG",
    shortDescription: "Turn WebP images into widely-supported PNG files.",
    description:
      "Convert WebP images to PNG, preserving transparency, entirely in your browser — no uploads required.",
    metaDescription:
      "Convert WebP images to PNG for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "jpg-png-converter",
    name: "JPG ⇄ PNG Converter",
    shortDescription: "Convert JPG to PNG or PNG to JPG with one toggle.",
    description:
      "Convert between JPG and PNG in either direction — pick your direction, drop your images, and download the result.",
    metaDescription:
      "Convert JPG to PNG or PNG to JPG for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "image-converter",
    name: "Universal Image Converter",
    shortDescription: "Convert between JPG, PNG, WebP, GIF, BMP, AVIF, and TIFF.",
    description:
      "Convert an image to almost any format — JPG, PNG, WebP, GIF, BMP, AVIF, or TIFF — entirely in your browser.",
    metaDescription:
      "Convert images between JPG, PNG, WebP, GIF, BMP, AVIF, and TIFF for free. Runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "image-resizer",
    name: "Image Resizer",
    shortDescription: "Resize photos by exact pixels or by percentage.",
    description:
      "Resize an image to exact pixel dimensions or scale it by percentage, with the option to lock the aspect ratio.",
    metaDescription:
      "Resize images by pixels or percentage for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "image-compressor",
    name: "Image Compressor",
    shortDescription: "Shrink file size while keeping reasonable quality.",
    description:
      "Compress a photo to a smaller file size with an adjustable quality slider — see the size saved before you download.",
    metaDescription:
      "Compress images to reduce file size for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "remove-exif-data",
    name: "Remove EXIF & Location Data",
    shortDescription: "Strip hidden camera and GPS metadata before sharing.",
    description:
      "See what metadata — camera model, timestamp, GPS location — is hidden in your photos, then strip it out before you share them.",
    metaDescription:
      "Remove EXIF and GPS location metadata from photos for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}

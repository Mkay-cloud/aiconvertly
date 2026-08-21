export type CommonConversion = { label: string; slug: string };

export const commonConversions: CommonConversion[] = [
  { label: "PDF to JPG", slug: "pdf-to-jpg" },
  { label: "JPG to PDF", slug: "jpg-to-pdf" },
  { label: "HEIC to JPG", slug: "heic-to-jpg" },
  { label: "WebP to PNG", slug: "webp-to-png" },
  { label: "PNG to JPG", slug: "jpg-png-converter" },
  { label: "JPG to PNG", slug: "jpg-png-converter" },
  { label: "Image to WebP", slug: "image-converter" },
  { label: "Image to AVIF", slug: "image-converter" },
  { label: "TIFF to PNG", slug: "image-converter" },
  { label: "Merge PDF files", slug: "merge-pdf" },
];

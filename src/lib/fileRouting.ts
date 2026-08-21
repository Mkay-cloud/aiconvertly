import type { DetectedKind } from "./detectFileType";

export type RouteOption = { slug: string; actionLabel: string };

const PDF_OPTIONS: RouteOption[] = [
  { slug: "pdf-to-jpg", actionLabel: "Convert to JPG" },
  { slug: "merge-pdf", actionLabel: "Merge with other PDFs" },
  { slug: "split-pdf", actionLabel: "Split into pages" },
  { slug: "rotate-pdf", actionLabel: "Rotate pages" },
];

const GENERAL_IMAGE_TOOLS: RouteOption[] = [
  { slug: "image-converter", actionLabel: "Convert to another format" },
  { slug: "image-resizer", actionLabel: "Resize" },
];

const COMPRESS_OPTION: RouteOption = { slug: "image-compressor", actionLabel: "Compress" };
const EXIF_OPTION: RouteOption = {
  slug: "remove-exif-data",
  actionLabel: "Remove EXIF & location data",
};

/**
 * Mirrors each tool's actual accepted formats (see each Dropzone's `accept`
 * prop) so we only ever route a file to a tool that can really open it.
 */
export function getRouteOptions(kind: DetectedKind): RouteOption[] {
  if (kind.category === "pdf") return PDF_OPTIONS;

  if (kind.category !== "image") return [];

  switch (kind.format) {
    case "heic":
      return [{ slug: "heic-to-jpg", actionLabel: "Convert to JPG" }];
    case "webp":
      return [
        { slug: "webp-to-png", actionLabel: "Convert to PNG" },
        ...GENERAL_IMAGE_TOOLS,
        COMPRESS_OPTION,
        EXIF_OPTION,
      ];
    case "jpeg":
      return [
        { slug: "jpg-png-converter", actionLabel: "Convert to PNG" },
        { slug: "jpg-to-pdf", actionLabel: "Convert to PDF" },
        ...GENERAL_IMAGE_TOOLS,
        COMPRESS_OPTION,
        EXIF_OPTION,
      ];
    case "png":
      return [
        { slug: "jpg-png-converter", actionLabel: "Convert to JPG" },
        { slug: "jpg-to-pdf", actionLabel: "Convert to PDF" },
        ...GENERAL_IMAGE_TOOLS,
        COMPRESS_OPTION,
        EXIF_OPTION,
      ];
    case "tiff":
      return [...GENERAL_IMAGE_TOOLS, EXIF_OPTION];
    case "gif":
    case "bmp":
    case "avif":
      return GENERAL_IMAGE_TOOLS;
    default:
      return [];
  }
}

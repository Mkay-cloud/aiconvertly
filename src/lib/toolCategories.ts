import { tools, type Tool } from "./tools";

/**
 * Single source of truth for which tools belong to which category. Anything
 * that groups or filters tools by category (the Format Catalog, the
 * homepage tool grid, the header's Tools dropdown) reads from here instead
 * of re-defining its own slug lists.
 */
export type CategoryId = "pdf" | "image" | "video" | "audio";

export const categoryToolSlugs: Record<CategoryId, string[]> = {
  pdf: ["merge-pdf", "split-pdf", "rotate-pdf", "pdf-to-jpg", "jpg-to-pdf"],
  image: [
    "heic-to-jpg",
    "webp-to-png",
    "jpg-png-converter",
    "image-converter",
    "image-resizer",
    "image-compressor",
    "remove-exif-data",
    "enhance-image-quality",
  ],
  video: [
    "mp4-to-mp3",
    "video-converter",
    "video-to-gif",
    "trim-video-audio",
    "compress-video",
    "remove-audio-from-video",
    "merge-videos",
    "change-video-speed",
    "video-resolution-converter",
    "enhance-video-quality",
  ],
  // trim-video-audio works on both video and audio, so it's intentionally
  // listed under both.
  audio: ["audio-converter", "trim-video-audio", "merge-audio"],
};

/**
 * Coarser grouping used for homepage sections, filter tabs, and the header
 * dropdown -- video and audio are merged into one "Video & Audio" bucket
 * (they already share tooling and overlap on tools like Trim), so every
 * tool lands in exactly one of these three sections.
 */
export type HomeCategoryId = "pdf" | "image" | "video-audio";

export const homeCategories: {
  id: HomeCategoryId;
  tabLabel: string;
  sectionLabel: string;
}[] = [
  { id: "pdf", tabLabel: "PDF", sectionLabel: "PDF Tools" },
  { id: "image", tabLabel: "Images", sectionLabel: "Image Tools" },
  { id: "video-audio", tabLabel: "Video & Audio", sectionLabel: "Video & Audio Tools" },
];

const homeCategorySlugs: Record<HomeCategoryId, string[]> = {
  pdf: categoryToolSlugs.pdf,
  image: categoryToolSlugs.image,
  "video-audio": Array.from(new Set([...categoryToolSlugs.video, ...categoryToolSlugs.audio])),
};

export function toolsForHomeCategory(id: HomeCategoryId): Tool[] {
  const slugs = new Set(homeCategorySlugs[id]);
  return tools.filter((tool) => slugs.has(tool.slug));
}

/**
 * Custom event the header's Tools dropdown fires so the homepage's filter
 * tabs can react instantly to a same-page category click. A same-page
 * `/#tools-pdf` link only changes the URL hash via history.pushState,
 * which -- unlike a real navigation or the back/forward buttons -- does
 * *not* fire the browser's native `hashchange` event, so that alone isn't
 * enough to notify an already-mounted homepage.
 */
export const TOOL_CATEGORY_NAV_EVENT = "toolcategorynav";

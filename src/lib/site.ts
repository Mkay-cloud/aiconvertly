import { categoryToolSlugs, type CategoryId } from "./toolCategories";
import { tools } from "./tools";

export const SITE_URL = "https://aiconvertly.online";
export const SITE_NAME = "AI convertly";

const CATEGORY_LABELS: Record<CategoryId, string> = {
  pdf: "PDF",
  image: "image",
  audio: "audio",
  video: "video",
};

// Display order for the category summary below -- independent of however
// categoryToolSlugs happens to declare its keys, so the sentence always
// reads in the same sensible order.
const CATEGORY_ORDER: CategoryId[] = ["pdf", "image", "audio", "video"];

function activeCategoryLabels(): string[] {
  return CATEGORY_ORDER.filter((id) => categoryToolSlugs[id].length > 0).map(
    (id) => CATEGORY_LABELS[id]
  );
}

// oxfordComma is false for "&" (tight lists like the <title> and OG image,
// where "audio & video" without a trailing comma reads better than "audio,
// & video") and true for "and" (the full-sentence description).
function joinList(items: string[], conjunction: string, oxfordComma: boolean): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return items.join(` ${conjunction} `);
  const separator = oxfordComma ? `, ${conjunction} ` : ` ${conjunction} `;
  return `${items.slice(0, -1).join(", ")}${separator}${items[items.length - 1]}`;
}

/**
 * Short category summary ("PDF, image, audio & video") for tight spaces --
 * the <title> tag and the OG share image. Derived from categoryToolSlugs
 * (the same tool-registry-backed source already used to fix the "N free
 * tools" hero badge staleness bug), so a category with no tools left in it
 * drops out on its own and a newly added category appears automatically.
 */
export const SITE_CATEGORY_SUMMARY = joinList(activeCategoryLabels(), "&", false);

/**
 * Longer form for the meta/OG/Twitter description and structured data --
 * also names "AI-powered enhancement" whenever the registry has at least
 * one tool marked aiPowered, so that phrase appears or disappears with the
 * tools themselves instead of needing a hand-edit.
 */
const hasAiPoweredTool = tools.some((tool) => tool.aiPowered);
const descriptionCategories = hasAiPoweredTool
  ? [...activeCategoryLabels(), "AI-powered enhancement"]
  : activeCategoryLabels();
const SITE_CATEGORY_SUMMARY_FULL = joinList(descriptionCategories, "and", true);

// Single source for the site-level description -- reused by the root
// layout's <meta>, Open Graph, and Twitter tags, the homepage's own hero
// copy, the OG share image, and the homepage's structured data, so none of
// them can drift into describing the site differently (or, as before this
// fix, into going stale as new tool categories are added).
export const SITE_DESCRIPTION = `AI convertly offers free ${SITE_CATEGORY_SUMMARY_FULL} tools — everything runs in your browser. No uploads, no accounts, no limits.`;

export const SITE_TITLE = `AI convertly — Free ${SITE_CATEGORY_SUMMARY} tools, right in your browser`;

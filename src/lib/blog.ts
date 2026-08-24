import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { getTool } from "./tools";

// content/ (not public/) since these are Markdown source files read at
// build time on the server, not static assets served directly to the
// browser -- same distinction the project already makes for public/ffmpeg
// etc. (browser-served binaries) vs. src/lib/tools.ts (server-side data).
const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type BlogPostMeta = {
  title: string;
  description: string;
  slug: string;
  /** ISO date string, e.g. "2026-08-23". */
  publishDate: string;
  category: string;
  /** Slug of a tool in the shared tool registry, for the end-of-article CTA. */
  relatedTool?: string;
};

export type BlogPost = BlogPostMeta & {
  contentHtml: string;
};

/**
 * True for a plain editorial reference doc (e.g. content/blog/CALENDAR.md,
 * content/blog/WRITING-GUIDE.md) -- content that lives alongside the real
 * article files for editors to find easily, but isn't itself a published
 * post. Distinguished by having no frontmatter at all, rather than by an
 * ever-growing list of specific filenames: a post with *some* frontmatter
 * but a missing required field is still a real content bug and must keep
 * failing loudly in readPostFile below, not get silently swept into this
 * bucket.
 */
function isReferenceFile(fileSlug: string): boolean {
  const raw = fs.readFileSync(path.join(BLOG_DIR, `${fileSlug}.md`), "utf8");
  const { data } = matter(raw);
  return Object.keys(data).length === 0;
}

function readSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""))
    .filter((slug) => !isReferenceFile(slug));
}

function readPostFile(fileSlug: string): { meta: BlogPostMeta; content: string } {
  const raw = fs.readFileSync(path.join(BLOG_DIR, `${fileSlug}.md`), "utf8");
  const { data, content } = matter(raw);

  // Fail loudly at build time on malformed frontmatter -- these are
  // developer-authored files, not user input, so a missing required field
  // is a content bug that should be caught immediately, not silently
  // produce a broken page. Same reasoning as getTool(slug)! elsewhere.
  const required: (keyof BlogPostMeta)[] = ["title", "description", "slug", "publishDate", "category"];
  for (const key of required) {
    if (!data[key]) {
      throw new Error(`content/blog/${fileSlug}.md is missing required frontmatter field "${key}"`);
    }
  }
  if (data.slug !== fileSlug) {
    throw new Error(
      `content/blog/${fileSlug}.md's frontmatter slug ("${data.slug}") doesn't match its filename`
    );
  }
  if (data.relatedTool && !getTool(data.relatedTool)) {
    throw new Error(
      `content/blog/${fileSlug}.md's relatedTool ("${data.relatedTool}") doesn't match any tool slug`
    );
  }

  const meta: BlogPostMeta = {
    title: data.title,
    description: data.description,
    slug: data.slug,
    publishDate: data.publishDate,
    category: data.category,
    relatedTool: data.relatedTool,
  };
  return { meta, content };
}

/** All posts' frontmatter, newest first -- for the blog index and sitemap. */
export function getAllBlogPosts(): BlogPostMeta[] {
  return readSlugs()
    .map((slug) => readPostFile(slug).meta)
    .sort((a, b) => (a.publishDate < b.publishDate ? 1 : -1));
}

export function getBlogSlugs(): string[] {
  return readSlugs();
}

/** A single post's frontmatter plus its Markdown body rendered to HTML. */
export function getBlogPost(slug: string): BlogPost | undefined {
  if (!readSlugs().includes(slug)) return undefined;
  const { meta, content } = readPostFile(slug);
  const contentHtml = marked.parse(content, { async: false }) as string;
  return { ...meta, contentHtml };
}

/**
 * URL for a post's generated featured image -- a stable, un-hashed route
 * (src/app/blog/[slug]/featured-image/route.ts) shared by both the
 * visible <img> usages (blog index cards, article banner) and, via
 * src/app/blog/[slug]/opengraph-image.tsx, the article's OG/Twitter
 * image. One generator, two thin routes -- see blogImage.tsx.
 */
export function featuredImageUrl(slug: string): string {
  return `/blog/${slug}/featured-image`;
}

export function formatPublishDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

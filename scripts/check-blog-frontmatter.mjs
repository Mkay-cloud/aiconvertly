#!/usr/bin/env node --experimental-strip-types
/**
 * Build-time gate against a real, recurring content bug: `publishDate`
 * in a blog post's frontmatter must be a quoted YAML string
 * ('2026-08-28'), not a bare date/datetime scalar (2026-08-28 or
 * 2026-08-28T00:00:00.000Z). YAML resolves an unquoted date-shaped
 * scalar to a native Date object, not a string -- gray-matter hands that
 * Date straight through, src/lib/blog.ts's own required-field check
 * doesn't catch it (a Date object is truthy, so `!data.publishDate`
 * never fires), and the object silently produces "Invalid Date" wherever
 * it's later treated as a string (formatPublishDate's own template
 * literal, the <time dateTime> attribute, the post-list sort comparison
 * in getAllBlogPosts). No build error, no lint error -- the page just
 * renders wrong. This exact bug shipped live on video-format-converter's
 * publishDate before this script existed (confirmed both by reproducing
 * it locally against the real frontmatter and by fetching the live page,
 * which showed "Invalid Date" in its byline), and per this repo's own
 * content/blog/WRITING-GUIDE.md it had already broken at least one other
 * article's badge before that. Runs automatically before every build
 * (see package.json's "prebuild" script), same wiring as the sibling
 * check-calendar-consistency.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const BLOG_DIR = path.join(REPO_ROOT, "content", "blog");

const DATE_STRING_RE = /^\d{4}-\d{2}-\d{2}$/;

function main() {
  const files = fs.readdirSync(BLOG_DIR).filter((name) => name.endsWith(".md"));
  const errors = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
    const { data } = matter(raw);

    // A reference doc (CALENDAR.md, WRITING-GUIDE.md, any future one)
    // has no frontmatter at all -- same isReferenceFile signal blog.ts
    // and check-calendar-consistency.mjs both already use. Nothing to
    // check here.
    if (!data || Object.keys(data).length === 0) continue;

    const { publishDate } = data;

    if (typeof publishDate !== "string") {
      // The actual bug this script exists to catch: YAML silently
      // turned the frontmatter value into a Date object because it
      // wasn't quoted.
      errors.push(
        `${file}: publishDate must be a quoted YAML string ('YYYY-MM-DD'), but YAML parsed it as a ${
          publishDate instanceof Date ? "Date" : typeof publishDate
        } (${JSON.stringify(publishDate)}). Quote it in the source file, e.g. publishDate: '${
          publishDate instanceof Date ? publishDate.toISOString().slice(0, 10) : publishDate
        }'`
      );
      continue;
    }

    if (!DATE_STRING_RE.test(publishDate)) {
      // A string, but not the plain YYYY-MM-DD shape every correctly-
      // formatted post in this repo uses (formatPublishDate appends its
      // own "T00:00:00Z" and re-parses, so anything with its own time
      // component or non-ISO shape is also a latent version of the same
      // bug class).
      errors.push(
        `${file}: publishDate is a string but not plain "YYYY-MM-DD" (got ${JSON.stringify(
          publishDate
        )}) -- formatPublishDate() appends its own time component, so this can still misparse.`
      );
    }
  }

  if (errors.length > 0) {
    console.error("check-blog-frontmatter: found publishDate problems that would render as \"Invalid Date\":\n");
    for (const err of errors) console.error(`  - ${err}`);
    console.error("");
    process.exit(1);
  }

  console.log(`check-blog-frontmatter: publishDate OK on all ${files.length} content/blog/ files.`);
}

main();

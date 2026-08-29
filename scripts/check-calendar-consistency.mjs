#!/usr/bin/env node --experimental-strip-types
/**
 * Build-time consistency check between content/blog/CALENDAR.md (the
 * editorial planning doc) and the real article files in content/blog/.
 * Runs automatically before every build (see package.json's "prebuild"
 * script -- npm's own lifecycle convention, not custom wiring).
 *
 * Catches exactly two kinds of drift between the calendar and reality,
 * both real bugs the person maintaining CALENDAR.md forgot to fix:
 *
 *   1. A row is marked Published, but no real article file actually
 *      matches it -- the row was marked done, but nothing was ever
 *      written (or written to a different slug the row was never
 *      updated to reference).
 *   2. A real article exists whose title exactly matches a row that's
 *      still marked Pending -- the article WAS written, but the row's
 *      Status cell was never flipped to Published.
 *
 * Deliberately does NOT flag an article with no matching calendar row at
 * all (e.g. how-to-open-heic-file, published before CALENDAR.md existed,
 * or any future one-off not drawn from the calendar) -- CALENDAR.md's own
 * header note says its 27 rows aren't meant to be an exhaustive list of
 * every article the site will ever have, so an unmatched article is
 * normal, not drift.
 *
 * A row counts as matching a real article by either signal:
 *   - The article's frontmatter `title` is identical to the row's Title
 *     cell, case/whitespace-insensitively (the same real, deliberate
 *     signal this exact class of bug was caught by earlier: a draft's
 *     title turning out to be a verbatim match for a different row than
 *     the one it was first assumed to belong to).
 *   - The row's Content Note cell contains a backtick-quoted slug
 *     (`` `some-slug` ``) equal to the article's real slug -- the
 *     existing convention already used in this file itself (see rows
 *     for how-video-conversion-works-mp4-webm-mov-explained and
 *     how-to-resize-a-photo-to-an-exact-kb-size) to record which file
 *     fulfills a row once it's written.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const BLOG_DIR = path.join(REPO_ROOT, "content", "blog");
const CALENDAR_PATH = path.join(BLOG_DIR, "CALENDAR.md");

/**
 * Real articles' slug + title, read directly rather than through
 * src/lib/blog.ts's getAllBlogPosts(): that module has its own further
 * extensionless internal import (`from "./tools"`, no ".ts") that Node's
 * native --experimental-strip-types loader can't resolve on its own --
 * the same gap capture-screenshots.mjs already works around by importing
 * tools.ts directly instead of going through blog.ts. Mirrors blog.ts's
 * own isReferenceFile check (a file with no frontmatter at all, e.g.
 * CALENDAR.md itself or WRITING-GUIDE.md, is a reference doc, not a real
 * post) since only slug + title are needed here, not full validation --
 * blog.ts's own readPostFile already enforces the rest at Next.js build
 * time.
 */
function readRealArticles() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const articles = [];
  for (const file of fs.readdirSync(BLOG_DIR)) {
    if (!file.endsWith(".md")) continue;
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
    const { data } = matter(raw);
    if (Object.keys(data).length === 0) continue; // reference doc, not a real post
    if (data.title) articles.push({ slug, title: String(data.title) });
  }
  return articles;
}

/** One calendar row, parsed from its 7-column Markdown table cell. */
export function parseCalendarRows(raw) {
  const rows = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    // Skips the header row ("# | Category | ...", first cell "#") and the
    // separator row ("---|---|...") -- only real data rows have a numeric
    // first cell. Also skips any malformed line that doesn't have exactly
    // the table's 7 columns, rather than silently misreading it.
    if (cells.length !== 7 || !/^\d+$/.test(cells[0])) continue;
    const [number, category, title, targetKeywords, relatedToolSlug, contentNote, status] = cells;
    rows.push({ number: Number(number), category, title, targetKeywords, relatedToolSlug, contentNote, status });
  }
  return rows;
}

function normalizeTitle(title) {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** A row's Content Note cell may record the real slug that fulfilled it, e.g. "Published as `some-slug`". */
function slugsReferencedIn(contentNote) {
  return [...contentNote.matchAll(/`([a-z0-9-]+)`/gi)].map((m) => m[1].toLowerCase());
}

/** Returns the reason a row matches an article ("title" or "content-note-slug"), or null if it doesn't. */
function rowMatchReason(row, article) {
  if (normalizeTitle(row.title) === normalizeTitle(article.title)) return "title";
  if (slugsReferencedIn(row.contentNote).includes(article.slug.toLowerCase())) return "content-note-slug";
  return null;
}

/**
 * Runs the two checks described up top. Returns a list of error message
 * strings (empty if the calendar and content/blog/ are consistent).
 * Pure and file-I/O-free (both inputs are passed in) so it can be
 * exercised directly against synthetic data in a test, not just the real
 * files on disk.
 */
export function checkConsistency(calendarRows, articles) {
  const errors = [];

  for (const row of calendarRows) {
    let matchingArticle = null;
    let matchReason = null;
    for (const article of articles) {
      const reason = rowMatchReason(row, article);
      if (reason) {
        matchingArticle = article;
        matchReason = reason;
        break;
      }
    }

    if (row.status === "Published" && !matchingArticle) {
      errors.push(
        `CALENDAR.md row ${row.number} ("${row.title}") is marked Published, but no article in content/blog/ matches it ` +
          `(by title or by a "Published as \`slug\`" reference in its Content Note). Either the article hasn't been written ` +
          `yet (set Status back to Pending), or it was published under a slug this row was never updated to reference.`
      );
    }

    if (row.status !== "Published" && matchingArticle) {
      const reasonText = matchReason === "title" ? "title match" : "Content Note already references its slug";
      errors.push(
        `CALENDAR.md row ${row.number} ("${row.title}") is marked ${row.status || "(empty)"}, but content/blog/${matchingArticle.slug}.md ` +
          `already covers this exact topic (${reasonText}). Update its Status to Published, or reword one of the two ` +
          `titles if this is a coincidental collision, not the same article.`
      );
    }
  }

  return errors;
}

function main() {
  const raw = fs.readFileSync(CALENDAR_PATH, "utf8");
  const calendarRows = parseCalendarRows(raw);
  if (calendarRows.length === 0) {
    throw new Error(`Parsed zero rows from ${path.relative(REPO_ROOT, CALENDAR_PATH)} -- the table format may have changed; check the parser in this script.`);
  }
  const articles = readRealArticles();

  const errors = checkConsistency(calendarRows, articles);
  if (errors.length > 0) {
    console.error(`\nCALENDAR.md / content/blog/ consistency check failed (${errors.length} problem${errors.length === 1 ? "" : "s"}):\n`);
    for (const error of errors) console.error(`  - ${error}\n`);
    process.exit(1);
  }

  console.log(`CALENDAR.md / content/blog/ consistency check passed (${calendarRows.length} calendar rows, ${articles.length} articles).`);
}

main();

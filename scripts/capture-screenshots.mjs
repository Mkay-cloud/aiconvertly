#!/usr/bin/env node --experimental-strip-types
/**
 * The screenshot-capture step of the publishing workflow, built around the
 * [SCREENSHOT: description] markers Cowork writes inline into every draft
 * (see content/blog/WRITING-GUIDE.md, section 5).
 *
 * For each marker found in a draft:
 *   1. Read the description to decide what it's asking for.
 *   2. If it names one of AI Convertly's own tools, drive that tool on a
 *      local dev server with Playwright (upload a small fixture file, and
 *      -- if the description implies a "result"/"after" state -- run the
 *      tool's primary action and wait for the result).
 *   3. If it names a known external tool (scripts/lib/externalTools.mjs),
 *      visit that tool's real site. Web-based tools get a genuine
 *      interactive attempt (upload a fixture file, wait for the resulting
 *      state); desktop-only tools get their homepage/marketing page, since
 *      there's no browser-drivable interactive state to capture for those.
 *   4. Save the screenshot under public/blog/ (the only directory Next.js
 *      serves automatically -- content/blog/ is server-side-only) and
 *      replace the marker in the Markdown with an absolute-path embed.
 *
 * Hard limits (scripts/lib/safety.mjs), enforced in code on every external
 * page before any interaction beyond a plain screenshot: never fill in a
 * real payment form, never fill in an account-creation/login form, never
 * attempt to get past a CAPTCHA. A marker that would require any of these
 * is skipped with a clear, visible note left in its place -- never a
 * broken image, and never something that silently blocks the rest of the
 * article.
 *
 * Usage:
 *   node --experimental-strip-types scripts/capture-screenshots.mjs [file ...]
 * With no arguments, every real article in content/blog/ (anything with
 * frontmatter -- see src/lib/blog.ts's isReferenceFile) is scanned for
 * markers.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import matter from "gray-matter";
import { chromium } from "playwright";
// Imported with its .ts extension so Node's native loader (running under
// --experimental-strip-types) resolves it directly -- unlike
// src/lib/toolCategories.ts, tools.ts has no further extensionless
// internal imports of its own to trip over the same resolution gap.
import { tools, getTool } from "../src/lib/tools.ts";
import { findExternalTool } from "./lib/externalTools.mjs";
import { unsafeReason } from "./lib/safety.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const BLOG_DIR = path.join(REPO_ROOT, "content", "blog");
// Screenshots must be written under public/, not content/blog/: content/ is
// a server-side-only source directory blog.ts reads via fs at request time
// (see BLOG_DIR above) -- it's never registered as a route or copied into
// the build's static output, so anything written there is unreachable by
// URL no matter what path a markdown image tag points at. public/ is the
// only directory Next.js serves automatically (same reason
// public/models/remove-noise/gtcrn.onnx, public/ffmpeg/, etc. all live
// there rather than under content/ or src/). Referenced in Markdown via the
// absolute path PUBLIC_BLOG_IMAGES_URL_PREFIX, not a relative "./..." one
// (a relative path would resolve against the *article's* URL,
// /blog/<slug>, not this directory).
const PUBLIC_BLOG_IMAGES_DIR = path.join(REPO_ROOT, "public", "blog");
const PUBLIC_BLOG_IMAGES_URL_PREFIX = "/blog";
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const DEV_SERVER_PORT = 3900;
const DEV_SERVER_BASE_URL = `http://localhost:${DEV_SERVER_PORT}`;
const CHROMIUM_FALLBACK_PATH = "/opt/pw-browsers/chromium";
const VIEWPORT = { width: 1280, height: 800 };

const MARKER_RE = /\[SCREENSHOT:\s*([^\]]+)\]/g;

// A marker asking to see the "after" state gets the tool's primary action
// clicked and awaited; anything else just captures the upload/options
// state, which is what most markers describing a UI step actually want.
const RESULT_STATE_RE =
  /\b(result|download|after|finished|complete|completed|output|converted|denoised|compressed|resized|enhanced|merged|extracted)\b/i;
const PRIMARY_ACTION_WORD_RE =
  /convert|compress|resize|merge|remove|enhance|extract|trim|rotate|split|change|noise|generate|crop|denoise/i;
// "click to browse" excludes the Dropzone itself: it has role="button" and
// its own hint text frequently contains an action word ("...to convert them
// to PNG"), which would otherwise satisfy PRIMARY_ACTION_WORD_RE below and
// get treated as the tool's primary action button instead of the dropzone
// it actually is.
const SKIP_BUTTON_RE = /cancel|download|remove file|move up|move down|click to browse/i;
const MAX_EXTERNAL_SHOTS_PER_TOOL_PER_RUN = 6;

// What kind of test file each tool needs -- a script-owned concern (which
// fixture to upload for an automated screenshot), not the same thing
// src/lib/toolCategories.ts's categories answer (which homepage/Format
// Catalog section a tool belongs to), so kept as its own small map here
// rather than importing that file: it has its own extensionless internal
// import of tools.ts that Node's native loader (even under
// --experimental-strip-types) doesn't resolve the way a bundler does.
// Falls back to the generic image fixture for any slug not listed below,
// which is wrong only for the few tools that specifically require a
// format none of the fixtures provide (e.g. heic-to-jpg needs a real
// .heic file) -- those simply won't produce a correct screenshot yet.
const FIXTURE_BY_SLUG = {
  "merge-pdf": "test-document.pdf",
  "split-pdf": "test-document.pdf",
  "rotate-pdf": "test-document.pdf",
  "pdf-to-jpg": "test-document.pdf",
  "webp-to-png": "test-image.webp",
  "mp4-to-mp3": "test-video.mp4",
  "video-converter": "test-video.mp4",
  "audio-converter": "test-audio.wav",
  "video-to-gif": "test-video.mp4",
  "trim-video-audio": "test-video.mp4",
  "compress-video": "test-video.mp4",
  "remove-audio-from-video": "test-video.mp4",
  "merge-videos": "test-video.mp4",
  "change-video-speed": "test-video.mp4",
  "merge-audio": "test-audio.wav",
  "video-resolution-converter": "test-video.mp4",
  "enhance-video-quality": "test-video.mp4",
  "remove-background-noise": "test-audio.wav",
};

function fixturePathForSlug(slug) {
  return path.join(FIXTURES_DIR, FIXTURE_BY_SLUG[slug] ?? "test-image.jpg");
}

/** Does this marker's description name one of AI Convertly's own tools? */
function findInternalTool(description, frontmatterRelatedTool) {
  const lower = description.toLowerCase();
  if (/\bai convertly\b|\bthis tool\b|\bthis site\b|\bthe site\b/.test(lower) && frontmatterRelatedTool) {
    const tool = getTool(frontmatterRelatedTool);
    if (tool) return tool;
  }
  return (
    tools.find((t) => lower.includes(t.name.toLowerCase())) ??
    tools.find((t) => lower.includes(t.slug.replace(/-/g, " ")))
  );
}

function isReferenceFile(fileSlug) {
  const raw = fs.readFileSync(path.join(BLOG_DIR, `${fileSlug}.md`), "utf8");
  const { data } = matter(raw);
  return Object.keys(data).length === 0;
}

function findDrafts(explicitFiles) {
  if (explicitFiles.length > 0) return explicitFiles.map((f) => path.resolve(f));
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .filter((slug) => !isReferenceFile(slug))
    .map((slug) => path.join(BLOG_DIR, `${slug}.md`));
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function startDevServer() {
  const child = spawn("npm", ["run", "dev", "--", "-p", String(DEV_SERVER_PORT)], {
    cwd: REPO_ROOT,
    stdio: "ignore",
    detached: true,
  });
  return child;
}

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch {
    // Matches this environment's pre-installed browser version mismatch
    // (see scripts/README section in the PR this shipped in) -- falls back
    // to the stable /opt/pw-browsers/chromium symlink rather than trying
    // to download a browser, which this sandbox's network policy blocks
    // anyway for most hosts.
    if (fs.existsSync(CHROMIUM_FALLBACK_PATH)) {
      return chromium.launch({ executablePath: CHROMIUM_FALLBACK_PATH });
    }
    throw new Error("Could not launch Chromium (no matching Playwright browser, and no fallback found).");
  }
}

async function clickPrimaryAction(page) {
  const buttons = await page.getByRole("button").all();
  for (const btn of buttons) {
    const text = (await btn.innerText().catch(() => "")).trim();
    if (!text || SKIP_BUTTON_RE.test(text) || !PRIMARY_ACTION_WORD_RE.test(text)) continue;
    const disabled = await btn.isDisabled().catch(() => true);
    if (disabled) continue;
    await btn.click().catch(() => {});
    return true;
  }
  return false;
}

async function waitForDownloadButton(page, timeoutMs) {
  try {
    await page.getByRole("button", { name: "Download", exact: true }).waitFor({ state: "visible", timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

/** Drives one of our own tool pages and returns { screenshot, note }. */
async function captureInternal(page, tool, description) {
  await page.setViewportSize(VIEWPORT);
  await page.goto(`${DEV_SERVER_BASE_URL}/tools/${tool.slug}`, { waitUntil: "networkidle", timeout: 30000 });
  const fixture = fixturePathForSlug(tool.slug);
  await page.setInputFiles('input[type="file"]', fixture);
  await page.waitForTimeout(600);

  let note = `AI Convertly tool: ${tool.name}`;
  if (RESULT_STATE_RE.test(description)) {
    const clicked = await clickPrimaryAction(page);
    if (clicked) {
      const ready = await waitForDownloadButton(page, 30000);
      note += ready ? " (result state)" : " (result state requested, but no Download button appeared in time -- captured whatever state was reached)";
    } else {
      note += " (result state requested, but no matching action button was found -- captured the upload state)";
    }
  }
  const screenshot = await page.screenshot();
  return { screenshot, note };
}

/**
 * Visits a known external tool's real site and returns either
 * { screenshot, note } or { skipped: true, publicNote, logNote } --
 * publicNote is the short, reader-safe text left in the article in place
 * of the marker (no raw error strings/URLs in front of a reader);
 * logNote carries the full technical detail for the run summary /
 * PR description, which is where that detail is actually useful.
 */
async function captureExternal(page, externalTool) {
  await page.setViewportSize(VIEWPORT);
  let response;
  try {
    response = await page.goto(externalTool.url, { waitUntil: "domcontentloaded", timeout: 30000 });
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : String(err);
    return {
      skipped: true,
      publicNote: `Screenshot pending: ${externalTool.name}'s site couldn't be reached during this pass.`,
      logNote: `couldn't reach ${externalTool.name} (${message})`,
    };
  }
  // A hard connection failure (DNS, TLS, a blocked/timed-out tunnel) can
  // still leave *some* page loaded -- the browser's own network-error
  // page -- without page.goto() itself throwing, so a response check alone
  // isn't enough; the response can also be null on a same-document
  // navigation. Screenshotting that error page and calling it a capture
  // would be a false success, not a skip -- this is what actually caught
  // that happening during this tool's own verification pass (see the PR
  // description).
  const bodyText = await page.locator("body").innerText().catch(() => "");
  if ((response && !response.ok()) || /err_[a-z_]+|this site can.?t be reached/i.test(bodyText)) {
    const status = response ? response.status() : "no response";
    return {
      skipped: true,
      publicNote: `Screenshot pending: ${externalTool.name}'s site didn't load correctly during this pass.`,
      logNote: `${externalTool.name} didn't load correctly (status: ${status})`,
    };
  }
  await page.waitForTimeout(800);

  let reason = await unsafeReason(page);
  if (reason) {
    return {
      skipped: true,
      publicNote: `Screenshot skipped: reaching this state on ${externalTool.name} isn't something this workflow does automatically.`,
      logNote: `${externalTool.name} ${reason} before any content could be safely captured`,
    };
  }

  if (externalTool.kind === "web-interactive") {
    const fileInput = page.locator('input[type="file"]').first();
    const hasFileInput = (await fileInput.count()) > 0;
    if (hasFileInput) {
      try {
        await fileInput.setInputFiles(path.join(FIXTURES_DIR, "test-image.jpg"), { timeout: 8000 });
        await page.waitForTimeout(2000);
      } catch {
        // Upload attempt failed (hidden input, custom picker, etc.) -- fall
        // through to a plain screenshot of whatever state we're in.
      }
    }
    reason = await unsafeReason(page);
    if (reason) {
      return {
        skipped: true,
        publicNote: `Screenshot skipped: reaching this state on ${externalTool.name} isn't something this workflow does automatically.`,
        logNote: `${externalTool.name} ${reason} while trying to reach the described state`,
      };
    }
    const screenshot = await page.screenshot();
    return {
      screenshot,
      note: hasFileInput
        ? `External tool: ${externalTool.name} (attempted a real upload interaction)`
        : `External tool: ${externalTool.name} (no upload UI found on this page -- captured as-is)`,
    };
  }

  // homepage-only (desktop app, or a web app with no unauthenticated
  // interactive state, e.g. Canva's real editor)
  const screenshot = await page.screenshot();
  return { screenshot, note: `External tool: ${externalTool.name} (desktop app or account-gated -- homepage/marketing page only)` };
}

async function processDraft(browser, filePath, summary, externalShotCounts) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const slug = path.basename(filePath, ".md");
  const markers = [...content.matchAll(MARKER_RE)];
  if (markers.length === 0) return;

  const page = await browser.newPage();
  let updated = content;
  let shotIndex = 0;

  for (const match of markers) {
    const [fullMatch, description] = match;
    const trimmedDescription = description.trim();
    let replacement;

    const internalTool = findInternalTool(trimmedDescription, data.relatedTool);
    const externalTool = !internalTool ? findExternalTool(trimmedDescription) : null;

    try {
      if (internalTool) {
        const { screenshot, note } = await captureInternal(page, internalTool, trimmedDescription);
        shotIndex += 1;
        const filename = `${slug}-shot-${String(shotIndex).padStart(2, "0")}.png`;
        fs.writeFileSync(path.join(PUBLIC_BLOG_IMAGES_DIR, filename), screenshot);
        replacement = `![${trimmedDescription}](${PUBLIC_BLOG_IMAGES_URL_PREFIX}/${filename})`;
        summary.captured.push({ file: slug, description: trimmedDescription, note });
      } else if (externalTool) {
        const count = externalShotCounts.get(externalTool.name) ?? 0;
        if (count >= MAX_EXTERNAL_SHOTS_PER_TOOL_PER_RUN) {
          replacement = `*(Screenshot unavailable: reached this run's screenshot limit for ${externalTool.name}.)*`;
          summary.skipped.push({ file: slug, description: trimmedDescription, reason: "per-tool run limit reached" });
        } else {
          const result = await captureExternal(page, externalTool);
          if (result.skipped) {
            replacement = `*(${result.publicNote})*`;
            summary.skipped.push({ file: slug, description: trimmedDescription, reason: result.logNote });
          } else {
            externalShotCounts.set(externalTool.name, count + 1);
            shotIndex += 1;
            const filename = `${slug}-shot-${String(shotIndex).padStart(2, "0")}.png`;
            fs.writeFileSync(path.join(PUBLIC_BLOG_IMAGES_DIR, filename), result.screenshot);
            replacement = `![${trimmedDescription}](${PUBLIC_BLOG_IMAGES_URL_PREFIX}/${filename})`;
            summary.captured.push({ file: slug, description: trimmedDescription, note: result.note });
            summary.externalToolsVisited.add(`${externalTool.name} (${externalTool.kind})`);
          }
        }
      } else {
        replacement = `*(Screenshot unavailable: couldn't determine whether "${trimmedDescription}" refers to an AI Convertly tool or a known external tool.)*`;
        summary.skipped.push({ file: slug, description: trimmedDescription, reason: "unresolved target" });
      }
    } catch (err) {
      // Keep the raw error out of reader-facing content -- it can contain
      // internal URLs/paths -- but keep it in full for the run summary,
      // where a maintainer actually needs it to diagnose the failure.
      replacement = `*(Screenshot unavailable: an unexpected error occurred while capturing this one.)*`;
      summary.skipped.push({ file: slug, description: trimmedDescription, reason: String(err) });
    }

    updated = updated.replace(fullMatch, replacement);
  }

  await page.close();
  fs.writeFileSync(filePath, matter.stringify(updated, data));
}

async function main() {
  fs.mkdirSync(PUBLIC_BLOG_IMAGES_DIR, { recursive: true });
  const explicitFiles = process.argv.slice(2);
  const drafts = findDrafts(explicitFiles);
  if (drafts.length === 0) {
    console.log("No drafts with [SCREENSHOT: ...] markers found.");
    return;
  }

  const summary = { captured: [], skipped: [], externalToolsVisited: new Set() };
  const externalShotCounts = new Map();

  const needsInternal = drafts.some((f) => MARKER_RE.test(fs.readFileSync(f, "utf8")));
  MARKER_RE.lastIndex = 0;
  let devServer = null;
  if (needsInternal) {
    console.log(`Starting dev server on :${DEV_SERVER_PORT} for internal tool screenshots...`);
    devServer = startDevServer();
    const up = await waitForServer(DEV_SERVER_BASE_URL, 60000);
    if (!up) throw new Error("Dev server didn't come up in time.");
  }

  const browser = await launchBrowser();
  try {
    for (const filePath of drafts) {
      console.log(`Processing ${path.relative(REPO_ROOT, filePath)}...`);
      await processDraft(browser, filePath, summary, externalShotCounts);
    }
  } finally {
    await browser.close();
    if (devServer) {
      try {
        process.kill(-devServer.pid);
      } catch {
        devServer.kill();
      }
    }
  }

  console.log("\n=== Screenshot capture summary ===");
  console.log(`Captured: ${summary.captured.length}`);
  for (const c of summary.captured) console.log(`  [${c.file}] ${c.description} -- ${c.note}`);
  console.log(`Skipped: ${summary.skipped.length}`);
  for (const s of summary.skipped) console.log(`  [${s.file}] ${s.description} -- ${s.reason}`);
  console.log(`External tools visited: ${summary.externalToolsVisited.size ? [...summary.externalToolsVisited].join(", ") : "(none)"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

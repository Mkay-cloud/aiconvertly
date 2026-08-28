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
 * When a known external tool's real site genuinely can't be reached this
 * pass (a network failure, not a deliberate policy skip -- see
 * captureExternal's skipKind), a generic, tool-colored fallback
 * illustration is drawn in its place instead of a bare text note (see
 * scripts/lib/fallbackIllustration.mjs) -- an abstract "app window" made
 * of plain shapes, never an attempt to fake the real screenshot, with an
 * honest caption underneath saying it's a stand-in.
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
import { renderFallbackIllustrationSVG } from "./lib/fallbackIllustration.mjs";

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
// Only sets the layout width and initial viewport height -- it doesn't cap
// what gets captured. Both screenshot paths below (screenshotToolContent's
// locator.screenshot() for internal tools, screenshotFullPage's
// page.screenshot({ fullPage: true }) for external sites) capture their
// full target regardless of this height. That matters because a "result"
// state (a compressed-file summary, a Download button) routinely renders
// further down the page than the upload form that was already on screen,
// past this height -- a viewport-only screenshot would silently crop it out
// and show the pre-result state instead, which is exactly what happened
// here before that was accounted for (see the PR description for how that
// was tracked down).
const VIEWPORT = { width: 1280, height: 800 };
// The element ToolPageShell wraps every tool's client component in --
// see its own comment. Scoping internal-tool screenshots to this element
// (rather than a full-page or plain viewport capture) keeps the site's own
// Header, Footer (which includes a full list of every tool -- see
// src/components/Footer.tsx), and the page's breadcrumb/title out of a
// screenshot meant to illustrate one specific UI step, not the page it
// lives on.
const TOOL_CONTENT_SELECTOR = "[data-tool-content]";

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
const SKIP_BUTTON_SUBSTRING_RE = /remove file|move up|move down|click to browse/i;
// Exact-label skips, not substring: several tools' real primary action
// button is labeled e.g. "Resize & download" or "Convert & download" --
// a plain substring match on "download" here would exclude those too,
// which is exactly what happened during this tool's own verification pass
// (see the PR description) before this was split out. Only the standalone
// "Download" button (the post-result download action, not something that
// advances the tool's own state) should be excluded.
const SKIP_BUTTON_EXACT = new Set(["cancel", "download"]);
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

/**
 * Does this marker name (or, failing that, does its surrounding section so
 * far name) one of AI Convertly's own tools? `searchText` is the current
 * H2 section's text up to and including the marker's own description --
 * a step-by-step article typically names the tool once (in the section
 * heading or its first step) and every later step in that section just
 * describes the resulting UI state without repeating the name, so relying
 * on the marker's own text alone would leave those later markers
 * unresolved. Whichever tool name's LAST occurrence in that combined text
 * is closest to the marker wins, so a marker that does explicitly name a
 * different tool always overrides the section's general context, and nothing
 * bleeds across a "## " section boundary (searchText is scoped to the
 * current section only, so an unrelated later section -- e.g. a
 * non-AI-Convertly desktop app's own steps -- won't inherit an earlier
 * section's tool by mistake).
 */
function findInternalTool(searchText, frontmatterRelatedTool) {
  const lower = searchText.toLowerCase();
  if (/\bai convertly\b|\bthis tool\b|\bthis site\b|\bthe site\b/.test(lower) && frontmatterRelatedTool) {
    const tool = getTool(frontmatterRelatedTool);
    if (tool) return tool;
  }
  let bestTool = null;
  let bestIndex = -1;
  for (const t of tools) {
    for (const needle of [t.name.toLowerCase(), t.slug.replace(/-/g, " ")]) {
      const idx = lower.lastIndexOf(needle);
      if (idx > bestIndex) {
        bestIndex = idx;
        bestTool = t;
      }
    }
  }
  return bestTool;
}

/** Text of the current "## " section up to (and not including) `markerIndex`, or from the top of the file if there's no preceding heading. */
function sectionTextBeforeMarker(content, markerIndex) {
  const before = content.slice(0, markerIndex);
  const headings = [...before.matchAll(/^##\s.*$/gm)];
  const sectionStart = headings.length > 0 ? headings[headings.length - 1].index : 0;
  return content.slice(sectionStart, markerIndex);
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

/**
 * A full-page (or, for screenshotToolContent below, a tall single-element)
 * screenshot with a `position: sticky` ancestor (this site's own <Header>,
 * and potentially any external site's) can render it duplicated -- once at
 * its natural flow position, once "stuck" -- because Chromium's full-page
 * capture repaints the whole scrollable area rather than a single scrolled
 * viewport, and a sticky element's position is resolved per-repaint.
 * Neutralizing position:sticky site-wide just for the screenshot (harmless
 * -- nothing here needs real scroll interaction) avoids that, at the cost
 * of not being a *perfectly* untouched capture of the live page; that
 * tradeoff is worth it for what actually ships in an article.
 *
 * Targets only elements actually using CSS sticky positioning -- not
 * position:absolute/relative generally, which plenty of this site's own
 * (and any external site's) decorative/layout elements legitimately rely
 * on and would visibly break if flattened to static too.
 */
async function neutralizeStickyPositioning(page) {
  await page
    .evaluate(() => {
      for (const el of document.querySelectorAll("*")) {
        if (getComputedStyle(el).position === "sticky") {
          el.style.setProperty("position", "static", "important");
        }
      }
    })
    .catch(() => {});
}

async function screenshotFullPage(page) {
  await neutralizeStickyPositioning(page);
  return page.screenshot({ fullPage: true });
}

/**
 * Screenshots only the bounded tool-content element (see
 * TOOL_CONTENT_SELECTOR's own comment) rather than the whole page: a
 * full-page capture of one of our own tool pages includes the site Header,
 * Footer (which lists every tool on the site), and the page's own
 * breadcrumb/title above the tool -- all irrelevant to, and distracting
 * from, the one specific UI step a given marker is illustrating. Like
 * screenshotFullPage, Playwright's locator.screenshot() captures the
 * element's full height regardless of what's currently in the viewport, so
 * a result panel rendering below the initial viewport height is still
 * captured in full, not cropped -- the earlier full-page approach's fix for
 * that same problem (see VIEWPORT's comment) carries over here.
 */
async function screenshotToolContent(page) {
  await neutralizeStickyPositioning(page);
  const content = page.locator(TOOL_CONTENT_SELECTOR);
  await content.waitFor({ state: "visible", timeout: 10000 });
  return content.screenshot();
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

/**
 * Polls for the tool's primary action button rather than taking one
 * snapshot right after the upload: a freshly-uploaded file (especially an
 * image, which still has to decode to a canvas before React re-renders the
 * button in) doesn't always have it on screen within a fixed short delay,
 * and a one-shot check right after that delay was seen to intermittently
 * miss a button that reliably existed a moment later -- this genuinely
 * happened during this article's own verification pass (see the PR
 * description), not a hypothetical race.
 */
/**
 * Best-effort attempt to make the page actually match what the marker's
 * description says, for the two adjustment shapes these articles
 * routinely describe: switching to a "Percentage" mode/tab, and dragging
 * a slider to a specific numeric value. Without this, a marker like
 * "the quality slider set to around 70" or "the percentage slider set to
 * around 50%" would just capture whatever the tool's default control
 * state happens to be -- which for several sibling markers in the same
 * article is the *same* default state every time, silently showing the
 * wrong thing while still being reported as a successful capture. This
 * is deliberately narrow (a named percentage mode, a slider matched to a
 * number in the text) rather than a general UI-command interpreter --
 * anything more specific than that isn't something a generic script can
 * safely infer from prose alone.
 */
async function applyDescribedAdjustments(page, description) {
  if (/percentage/i.test(description)) {
    const tab = page.getByRole("button", { name: "Percentage", exact: true });
    if ((await tab.count().catch(() => 0)) > 0) {
      await tab.click().catch(() => {});
    }
  }
  if (/slider/i.test(description)) {
    const match = description.match(/\b(\d{1,3})\s*%?/);
    if (match) {
      const value = match[1];
      const range = page.locator('input[type="range"]').first();
      if ((await range.count().catch(() => 0)) > 0) {
        await range
          .evaluate((el, val) => {
            // Setting .value directly wouldn't fire React's onChange (React
            // tracks the native setter, not just the DOM attribute) -- this
            // is the standard workaround: call the real native setter, then
            // dispatch the events React's listener actually reacts to.
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(el, val);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }, value)
          .catch(() => {});
      }
    }
  }
}

async function clickPrimaryAction(page, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const buttons = await page.getByRole("button").all();
    for (const btn of buttons) {
      const text = (await btn.innerText().catch(() => "")).trim();
      if (
        !text ||
        SKIP_BUTTON_EXACT.has(text.toLowerCase()) ||
        SKIP_BUTTON_SUBSTRING_RE.test(text) ||
        !PRIMARY_ACTION_WORD_RE.test(text)
      )
        continue;
      const disabled = await btn.isDisabled().catch(() => true);
      if (disabled) continue;
      // A real timeout (not a silently-swallowed error) -- returning
      // `true` when the click itself never actually landed would be worse
      // than returning `false`, since the caller takes `true` as a signal
      // the primary action genuinely ran.
      await btn.click({ timeout: 5000 });
      return true;
    }
    await page.waitForTimeout(300);
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
/**
 * Uploads the fixture and confirms the page actually reacted to it before
 * moving on, retrying the upload if not -- this is what actually caught
 * and fixed a real, intermittent bug during this tool's own verification
 * pass (see the PR description): `networkidle` after page.goto() doesn't
 * guarantee React has finished hydrating and attached its change-handler
 * yet, so a setInputFiles() that lands in that gap can silently no-op --
 * the DOM input's .files does get set, but nothing about the rendered
 * page changes, and every following step (finding buttons, capturing a
 * "loaded" state) then operates on the un-uploaded dropzone instead.
 * Comparing rendered body text before/after is a signal that works
 * generically across every tool's differently-shaped post-upload UI,
 * without needing to know each one's specific markup.
 */
async function uploadFixtureAndVerify(page, fixture, attempts = 3) {
  const before = await page.locator("body").innerText().catch(() => "");
  for (let attempt = 0; attempt < attempts; attempt++) {
    await page.setInputFiles('input[type="file"]', fixture);
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(300);
      const after = await page.locator("body").innerText().catch(() => "");
      if (after !== before) return true;
    }
  }
  return false;
}

/**
 * Drives one internal tool page and returns { screenshot, note }. Owns its
 * own page lifecycle (creates and closes a fresh page per *attempt*, not
 * just per marker) and retries the entire navigation-through-upload
 * sequence on failure, up to `maxAttempts` times, rather than trying to
 * fix a single attempt's timing. This is deliberately the "just try the
 * whole thing again, fresh" approach rather than one more targeted fix:
 * during this tool's own verification pass (see the PR description), the
 * concrete failure mode kept shifting under targeted fixes -- first a
 * hydration race after upload, then (once that was fixed) the file input
 * itself intermittently timing out to even appear, both against the same
 * Next.js dev server under real script load. A full fresh retry is
 * robust to whatever the underlying transient cause turns out to be,
 * without needing to keep chasing a new symptom each time.
 */
async function captureInternal(browser, tool, description, maxAttempts = 3) {
  const fixture = fixturePathForSlug(tool.slug);
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const page = await browser.newPage();
    try {
      await page.setViewportSize(VIEWPORT);
      await page.goto(`${DEV_SERVER_BASE_URL}/tools/${tool.slug}`, { waitUntil: "networkidle", timeout: 30000 });
      // A small settle buffer before the first upload attempt -- networkidle
      // reflects network activity, not whether React has hydrated and
      // attached its event listeners yet, which is the actual gap
      // uploadFixtureAndVerify below is guarding against.
      await page.waitForTimeout(300);
      await page.locator('input[type="file"]').waitFor({ state: "attached", timeout: 15000 });
      const uploaded = await uploadFixtureAndVerify(page, fixture);

      let note = `AI Convertly tool: ${tool.name}`;
      if (!uploaded) {
        if (attempt < maxAttempts) {
          await page.close();
          continue;
        }
        note += " (the page never visibly reacted to the upload after retrying -- captured whatever state was reached)";
        const screenshot = await screenshotToolContent(page);
        await page.close();
        return { screenshot, note };
      }
      await applyDescribedAdjustments(page, description);
      if (RESULT_STATE_RE.test(description)) {
        const clicked = await clickPrimaryAction(page);
        if (clicked) {
          // Not every tool shows a persistent post-result "Download"
          // button -- some (e.g. Image Resizer) trigger the browser
          // download immediately as a side effect of the primary action,
          // with no separate button to wait for at all. A short timeout is
          // enough to let real client-side processing (compression,
          // resizing, etc. on the small fixture files) finish either way,
          // without blocking for a button some tools will simply never show.
          const ready = await waitForDownloadButton(page, 8000);
          note += ready ? " (result state)" : " (result state requested; captured the state shortly after clicking the primary action)";
        } else {
          note += " (result state requested, but no matching action button was found -- captured the upload state)";
        }
      }
      const screenshot = await screenshotToolContent(page);
      await page.close();
      return { screenshot, note };
    } catch (err) {
      await page.close().catch(() => {});
      lastError = err;
      // loop for another attempt with a fresh page, unless this was the last one
    }
  }
  throw lastError;
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
      // "unreachable" (this case and the bad-response case below) is what
      // makes processDraft generate a fallback illustration instead of a
      // bare text note -- unlike "unsafe" below, this is a genuine capture
      // failure (the site might load fine on a future run), not a
      // deliberate policy skip.
      skipKind: "unreachable",
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
      skipKind: "unreachable",
      publicNote: `Screenshot pending: ${externalTool.name}'s site didn't load correctly during this pass.`,
      logNote: `${externalTool.name} didn't load correctly (status: ${status})`,
    };
  }
  await page.waitForTimeout(800);

  let reason = await unsafeReason(page);
  if (reason) {
    return {
      skipped: true,
      // Deliberate policy skip, not a capture failure -- the page loaded
      // fine, we're choosing not to proceed past a CAPTCHA/payment/signup
      // wall. No fallback illustration for this one: an illustration would
      // wrongly suggest we assessed what's behind that wall.
      skipKind: "unsafe",
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
        skipKind: "unsafe",
        publicNote: `Screenshot skipped: reaching this state on ${externalTool.name} isn't something this workflow does automatically.`,
        logNote: `${externalTool.name} ${reason} while trying to reach the described state`,
      };
    }
    const screenshot = await screenshotFullPage(page);
    return {
      screenshot,
      note: hasFileInput
        ? `External tool: ${externalTool.name} (attempted a real upload interaction)`
        : `External tool: ${externalTool.name} (no upload UI found on this page -- captured as-is)`,
    };
  }

  // homepage-only (desktop app, or a web app with no unauthenticated
  // interactive state, e.g. Canva's real editor)
  const screenshot = await screenshotFullPage(page);
  return { screenshot, note: `External tool: ${externalTool.name} (desktop app or account-gated -- homepage/marketing page only)` };
}

async function processDraft(browser, filePath, summary, externalShotCounts) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const slug = path.basename(filePath, ".md");
  const markers = [...content.matchAll(MARKER_RE)];
  if (markers.length === 0) return;

  let updated = content;
  let shotIndex = 0;
  // Buffered and only flushed to disk after every marker in this draft is
  // done, rather than written incrementally mid-loop -- writing into
  // public/blog/ while later markers are still being captured against the
  // *same running dev server* was found (during this tool's own
  // verification pass -- see the PR description) to be a real source of
  // capturing the wrong page state: Next dev's file watcher covers
  // public/ too, and a screenshot landing there mid-run could trigger a
  // reload that wiped out a just-clicked result state on whichever page
  // was mid-capture at that moment, before its own screenshot was taken.
  const pendingWrites = [];

  for (const match of markers) {
    const [fullMatch, description] = match;
    const trimmedDescription = description.trim();
    let replacement;

    // The marker's own text is appended last so an explicit tool name
    // there always wins over -- rather than getting shadowed by -- an
    // earlier mention in the section (findInternalTool takes whichever
    // name's last/rightmost occurrence in the combined text it's given).
    const sectionContext = `${sectionTextBeforeMarker(content, match.index)} ${trimmedDescription}`;
    const internalTool = findInternalTool(sectionContext, data.relatedTool);
    const externalTool = !internalTool ? findExternalTool(sectionContext) : null;

    try {
      if (internalTool) {
        // captureInternal owns its own page(s) -- see its own comment for
        // why a fresh page per attempt, not one shared across markers.
        const { screenshot, note } = await captureInternal(browser, internalTool, trimmedDescription);
        shotIndex += 1;
        const filename = `${slug}-shot-${String(shotIndex).padStart(2, "0")}.png`;
        pendingWrites.push({ filename, data: screenshot });
        replacement = `![${trimmedDescription}](${PUBLIC_BLOG_IMAGES_URL_PREFIX}/${filename})`;
        summary.captured.push({ file: slug, description: trimmedDescription, note });
      } else if (externalTool) {
        const count = externalShotCounts.get(externalTool.name) ?? 0;
        if (count >= MAX_EXTERNAL_SHOTS_PER_TOOL_PER_RUN) {
          replacement = `*(Screenshot unavailable: reached this run's screenshot limit for ${externalTool.name}.)*`;
          summary.skipped.push({ file: slug, description: trimmedDescription, reason: "per-tool run limit reached" });
        } else {
          const page = await browser.newPage();
          let result;
          try {
            result = await captureExternal(page, externalTool);
          } finally {
            await page.close();
          }
          if (result.skipped && result.skipKind === "unreachable") {
            // A genuine capture failure (the site just couldn't be
            // reached this pass), not a deliberate policy skip -- draw a
            // generic, tool-colored illustration instead of leaving a
            // bare text note in its place. See fallbackIllustration.mjs
            // for what this deliberately does and doesn't draw.
            shotIndex += 1;
            const filename = `${slug}-shot-${String(shotIndex).padStart(2, "0")}.svg`;
            const svg = renderFallbackIllustrationSVG(externalTool.name);
            pendingWrites.push({ filename, data: svg });
            // Stays on one line, no blank line before the caption -- a
            // blank line here would break out of whatever list item the
            // marker was inside (verified against a real markdown-list
            // marker during this feature's own verification pass: the
            // rest of the numbered list silently stopped rendering as a
            // list after the first blank-line caption).
            replacement = `![${trimmedDescription}](${PUBLIC_BLOG_IMAGES_URL_PREFIX}/${filename}) *(Illustration — a live screenshot of ${externalTool.name} couldn't be captured during this pass.)*`;
            summary.illustrated.push({ file: slug, description: trimmedDescription, reason: result.logNote });
          } else if (result.skipped) {
            replacement = `*(${result.publicNote})*`;
            summary.skipped.push({ file: slug, description: trimmedDescription, reason: result.logNote });
          } else {
            externalShotCounts.set(externalTool.name, count + 1);
            shotIndex += 1;
            const filename = `${slug}-shot-${String(shotIndex).padStart(2, "0")}.png`;
            pendingWrites.push({ filename, data: result.screenshot });
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

  for (const { filename, data: pngData } of pendingWrites) {
    fs.writeFileSync(path.join(PUBLIC_BLOG_IMAGES_DIR, filename), pngData);
  }
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

  const summary = { captured: [], illustrated: [], skipped: [], externalToolsVisited: new Set() };
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
  console.log(`Illustrated (fallback, real capture unreachable): ${summary.illustrated.length}`);
  for (const i of summary.illustrated) console.log(`  [${i.file}] ${i.description} -- ${i.reason}`);
  console.log(`Skipped: ${summary.skipped.length}`);
  for (const s of summary.skipped) console.log(`  [${s.file}] ${s.description} -- ${s.reason}`);
  console.log(`External tools visited: ${summary.externalToolsVisited.size ? [...summary.externalToolsVisited].join(", ") : "(none)"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

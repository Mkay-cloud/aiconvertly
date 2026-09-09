#!/usr/bin/env node
/**
 * Submits published AI Convertly URLs to IndexNow (both api.indexnow.org
 * and Bing's own endpoint directly, matching the two-endpoint pattern
 * already established on Techiebull). Mirrors Techiebull's own IndexNow
 * step, but as a real, committed, reusable script instead of one-off
 * inline curl commands typed into a session each time -- so this same
 * file can be called both by a human after a manual publish and by the
 * automated publish pipeline (see scripts/publish-article.mjs) without
 * re-deriving the request shape each time.
 *
 * Usage:
 *   node scripts/submit-indexnow.mjs <slug-or-full-url> [<slug-or-full-url> ...]
 *   node scripts/submit-indexnow.mjs --dry-run <slug-or-full-url> ...
 *
 * Each argument is either a bare blog slug (resolved to
 * `${SITE_URL}/blog/<slug>`) or an already-complete URL (used as-is, so a
 * tool page or any other route can be submitted too, not just blog posts).
 * --dry-run builds and prints the request without sending it -- useful
 * for verifying the key/URLs look right before actually notifying Bing.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(REPO_ROOT, "public");
const SITE_URL = "https://aiconvertly.online";
const SITE_HOST = "aiconvertly.online";

const ENDPOINTS = ["https://api.indexnow.org/indexnow", "https://www.bing.com/indexnow"];

/**
 * The IndexNow key is just the key file's own name (a 32-hex-char string)
 * -- found by pattern rather than hardcoded, so a future key rotation
 * (a new file dropped in public/) doesn't require touching this script.
 * Throws with a clear message if the file is ever missing, since a
 * silent no-op here would look like a successful submission that wasn't.
 */
export function findIndexNowKey() {
  const entries = fs.readdirSync(PUBLIC_DIR);
  const keyFile = entries.find((name) => /^[a-f0-9]{32}\.txt$/i.test(name));
  if (!keyFile) {
    throw new Error(
      `No IndexNow key file found in ${PUBLIC_DIR} (expected a <32-hex-char>.txt file). ` +
        "IndexNow submission needs this to exist and be publicly served before it can run."
    );
  }
  const key = keyFile.replace(/\.txt$/i, "");
  const fileContent = fs.readFileSync(path.join(PUBLIC_DIR, keyFile), "utf8").trim();
  if (fileContent !== key) {
    throw new Error(
      `IndexNow key file ${keyFile} doesn't contain its own name as its content ("${fileContent}") -- ` +
        "that mismatch would make Bing's key verification fail, so refusing to submit until it's fixed."
    );
  }
  return { key, keyLocation: `${SITE_URL}/${keyFile}` };
}

/** Turns a bare slug into a full blog URL; leaves anything already looking like a URL untouched. */
export function resolveUrl(slugOrUrl) {
  if (/^https?:\/\//i.test(slugOrUrl)) return slugOrUrl;
  const trimmed = slugOrUrl.replace(/^\/+/, "");
  if (trimmed.startsWith("blog/") || trimmed.startsWith("tools/")) return `${SITE_URL}/${trimmed}`;
  return `${SITE_URL}/blog/${trimmed}`;
}

/**
 * Submits urlList to both IndexNow endpoints. Each endpoint is submitted
 * independently and a failure on one doesn't cancel the other -- they're
 * two independent search engines' ingestion points, not a single
 * transaction. Returns per-endpoint results so the caller (a human running
 * this directly, or the automated publish pipeline) can log or surface
 * failures without the whole publish step being treated as failed: a
 * failed IndexNow ping never means the article itself failed to publish,
 * it only means discovery might be slightly slower.
 */
export async function submitIndexNow(urlList, { dryRun = false } = {}) {
  if (urlList.length === 0) throw new Error("submitIndexNow: urlList is empty -- nothing to submit.");

  const { key, keyLocation } = findIndexNowKey();
  const body = { host: SITE_HOST, key, keyLocation, urlList };

  if (dryRun) {
    return ENDPOINTS.map((endpoint) => ({ endpoint, dryRun: true, body }));
  }

  const results = [];
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      });
      const text = await res.text().catch(() => "");
      results.push({ endpoint, ok: res.ok, status: res.status, body: text.slice(0, 300) });
    } catch (err) {
      results.push({ endpoint, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const dryRun = rawArgs.includes("--dry-run");
  const args = rawArgs.filter((a) => a !== "--dry-run");

  if (args.length === 0) {
    console.error("Usage: node scripts/submit-indexnow.mjs [--dry-run] <slug-or-full-url> [<slug-or-full-url> ...]");
    process.exit(1);
  }

  const urlList = args.map(resolveUrl);
  console.log(`Submitting ${urlList.length} URL(s) to IndexNow${dryRun ? " (dry run)" : ""}:`);
  for (const url of urlList) console.log(`  - ${url}`);

  const results = await submitIndexNow(urlList, { dryRun });
  let anyFailed = false;
  for (const result of results) {
    if (result.dryRun) {
      console.log(`\n[dry run] would POST to ${result.endpoint}:`);
      console.log(JSON.stringify(result.body, null, 2));
      continue;
    }
    if (result.ok) {
      console.log(`OK   ${result.endpoint} -> ${result.status}`);
    } else {
      anyFailed = true;
      console.log(`FAIL ${result.endpoint} -> ${result.status ?? "network error"} ${result.error ?? result.body ?? ""}`);
    }
  }

  // A failed IndexNow ping is a warning, not a publish failure -- exit
  // non-zero only so an automated caller's logs make the failure visible,
  // never to make the caller treat the whole publish as having failed.
  if (anyFailed && !dryRun) process.exitCode = 2;
}

// Only runs the CLI when this file is executed directly (`node
// scripts/submit-indexnow.mjs ...`), not when it's imported by another
// script for its exported functions. Built with pathToFileURL rather than
// a plain `file://${process.argv[1]}` string, which silently never
// matches on Windows (argv[1] uses backslashes and no percent-encoding,
// e.g. "C:\Users\...\submit-indexnow.mjs", while import.meta.url is a
// real file:// URL like "file:///C:/Users/.../submit-indexnow.mjs") --
// that mismatch was caught running this exact script on the user's
// Windows machine, where main() silently never ran and the CLI produced
// no output and no error.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

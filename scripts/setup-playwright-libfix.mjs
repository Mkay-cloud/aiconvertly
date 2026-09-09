#!/usr/bin/env node
/**
 * One-time (but safe to re-run) fix for a real environment gap: the
 * Linux sandbox this repo's automation runs in (the Cowork desktop app's
 * device shell) ships Playwright's Chromium build, but is missing one of
 * its runtime shared libraries, libXdamage.so.1. The normal fix,
 * `npx playwright install-deps`, shells out to apt and needs root --
 * which fails here (`sudo: The "no new privileges" flag is set, which
 * prevents sudo from running as root`), a hard container restriction,
 * not something a retry or a different apt invocation gets around.
 *
 * `apt-get download <pkg>` doesn't need root, though -- it just fetches
 * the .deb to the current directory. `dpkg -x` extracts a .deb's
 * contents without installing it (no root needed for that either). So:
 * download the one package that ships the missing library, extract just
 * that one file, and drop it in a fixed, well-known directory. From
 * there, scripts/capture-screenshots.mjs's launchBrowser() points
 * LD_LIBRARY_PATH at that directory before ever calling
 * chromium.launch(), which is enough for the dynamic linker to find it
 * -- confirmed working end-to-end (launched, navigated, read a real page
 * title) before this script existed, then turned into this repeatable
 * form instead of a one-off shell command that only this session would
 * remember.
 *
 * Safe to run again: skips the download/extract entirely if the library
 * is already in place.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const LIBFIX_DIR = path.join(os.homedir(), ".aic-playwright-libfix");
const LIB_NAME = "libXdamage.so.1";
const APT_PACKAGE = "libxdamage1";

function alreadyFixed() {
  return fs.existsSync(path.join(LIBFIX_DIR, LIB_NAME));
}

export function ensurePlaywrightLibfix({ quiet = false } = {}) {
  if (process.platform !== "linux") {
    if (!quiet) console.log("setup-playwright-libfix: not on Linux, nothing to do.");
    return true;
  }
  if (alreadyFixed()) {
    if (!quiet) console.log(`setup-playwright-libfix: ${LIB_NAME} already in place at ${LIBFIX_DIR}.`);
    return true;
  }

  fs.mkdirSync(LIBFIX_DIR, { recursive: true });
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "aic-libfix-"));

  try {
    execFileSync("apt-get", ["download", APT_PACKAGE], { cwd: workDir, stdio: quiet ? "ignore" : "inherit" });
    const debFile = fs.readdirSync(workDir).find((f) => f.endsWith(".deb"));
    if (!debFile) throw new Error(`apt-get download reported success but no .deb landed in ${workDir}`);

    const extractDir = path.join(workDir, "extracted");
    execFileSync("dpkg", ["-x", debFile, extractDir], { cwd: workDir, stdio: quiet ? "ignore" : "inherit" });

    const found = execFileSync("find", [extractDir, "-name", LIB_NAME], { encoding: "utf8" }).trim().split("\n")[0];
    if (!found) throw new Error(`Extracted ${debFile} but couldn't find ${LIB_NAME} inside it.`);

    fs.copyFileSync(found, path.join(LIBFIX_DIR, LIB_NAME));
    if (!quiet) console.log(`setup-playwright-libfix: installed ${LIB_NAME} to ${LIBFIX_DIR}.`);
    return true;
  } catch (err) {
    console.error(
      `setup-playwright-libfix: couldn't fetch/extract ${APT_PACKAGE} (${err instanceof Error ? err.message : err}). ` +
        "Real Chromium-based screenshot capture will fail until this is resolved -- the pipeline still falls back to " +
        "illustrations for every marker in that case, so a draft still gets published, just without any real external captures."
    );
    return false;
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

// pathToFileURL, not a plain `file://${process.argv[1]}` string compare --
// that form silently never matches on Windows, a real bug this same
// codebase already shipped once (capture-screenshots.mjs) and submit-
// indexnow.mjs's own script separately hit and fixed the same way.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  ensurePlaywrightLibfix();
}

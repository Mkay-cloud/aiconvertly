#!/usr/bin/env node --experimental-strip-types
/**
 * Automated regression test for the marker-resolution logic in
 * capture-screenshots.mjs (findInternalTool, sectionTextBeforeMarker,
 * resolveMarkerTarget) -- covers the exact bug class found and fixed
 * twice in this pipeline's history: a marker resolving to whichever
 * candidate happened to be checked first or treated as a fallback tier,
 * rather than whichever candidate's match genuinely sits closest to the
 * marker in its own section context.
 *
 *   - PR #22: an internal self-reference ("AI Convertly") checked
 *     unconditionally before external tools resolved every iLoveIMG
 *     marker to AI Convertly's own tool instead, even with "iLoveIMG"
 *     named right next to the marker.
 *   - PR #24: platform resolution (native OS apps, e.g. "on a Mac") was
 *     a strict last-resort fallback, checked only when neither internal
 *     nor external matched at all, regardless of position -- so a
 *     distant "AI Convertly" mention still won over "on a Mac" sitting
 *     right next to the QuickTime marker.
 *
 * Both were fixed by making all three resolver categories compete on
 * which match is closest to the marker (resolveMarkerTarget). This file
 * exercises that comparison directly against synthetic section text, so
 * a future change that reintroduces an unconditional-priority shortcut
 * -- for either an existing category or a new fourth one -- fails a
 * build automatically instead of requiring someone to remember to
 * hand-verify it, the way this bug was actually caught both times.
 *
 * Run directly: node --experimental-strip-types --test scripts/capture-screenshots.test.mjs
 * Wired into "npm run prebuild" (see package.json) alongside the
 * CALENDAR.md consistency check, so it runs before every build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveMarkerTarget } from "./capture-screenshots.mjs";

// A real tool slug is required for findInternalTool's self-reference
// branch to resolve to anything (see its own comment) -- "video-converter"
// is a real entry in src/lib/tools.ts, used the same way these test
// sections use a real external tool name (iLoveIMG) and a real platform
// phrase ("on a Mac") rather than invented placeholders, so this test
// exercises the exact same registries the real pipeline does.
const RELATED_TOOL = "video-converter";

test("internal self-reference before a platform marker resolves to the platform (the QuickTime bug)", () => {
  const sectionContext = `
## How to convert a video file

### 1. AI Convertly's video converter

AI Convertly's converter handles this in your browser, no upload needed.

### 2. QuickTime, if you're on a Mac

Already on a Mac? QuickTime Player can export it directly.

3. Pick a resolution and export.`;
  const description = "the Export As dialog with a resolution selected";
  const winner = resolveMarkerTarget(`${sectionContext} ${description}`, RELATED_TOOL);

  assert.ok(winner, "expected a resolved target, got null (unresolved)");
  assert.equal(winner.kind, "platform");
  assert.equal(winner.tool.name, "macOS");
});

test("internal self-reference before an external tool's own marker resolves to the external tool (the iLoveIMG bug)", () => {
  const sectionContext = `
## Other ways to convert

### 1. AI Convertly's converter

AI Convertly isn't the only site that does this.

### 2. iLoveIMG

iLoveIMG's Convert tool does the same basic job.

1. Go to iloveimg.com and open its Convert tool.`;
  const description = "iLoveIMG's Convert tool page";
  const winner = resolveMarkerTarget(`${sectionContext} ${description}`, RELATED_TOOL);

  assert.ok(winner, "expected a resolved target, got null (unresolved)");
  assert.equal(winner.kind, "external");
  assert.equal(winner.tool.name, "iLoveIMG");
});

test("all three categories present: platform closest to the marker wins (genuine 3-way comparison)", () => {
  const sectionContext = `
## How to convert a video file

### 1. AI Convertly's converter

AI Convertly converts it in your browser.

### 2. iLoveIMG

iLoveIMG's Convert tool does the same job online.

### 3. QuickTime, if you're on a Mac

Already on a Mac? Use QuickTime's Export As.

1. Pick a resolution and export.`;
  const description = "the Export As dialog with a resolution selected";
  const winner = resolveMarkerTarget(`${sectionContext} ${description}`, RELATED_TOOL);

  assert.ok(winner, "expected a resolved target, got null (unresolved)");
  assert.equal(
    winner.kind,
    "platform",
    "all three resolvers had a real match here (internal, external, and platform) -- platform's \"on a Mac\" sits closest to the marker, so a correct 3-way rightmost-wins comparison must pick it, not just whichever category a partial (e.g. internal-vs-external-only, or internal-vs-platform-only) comparison would have preferred"
  );
});

test("all three categories present: external closest to the marker wins (confirms it's not always platform that wins)", () => {
  const sectionContext = `
## How to convert a video file

### 1. On a Mac, use QuickTime

Already on a Mac? QuickTime's Export As handles it.

### 2. AI Convertly's converter

AI Convertly converts it in your browser too.

### 3. iLoveIMG

Or use iLoveIMG's Convert tool.

1. Go to iloveimg.com and open its Convert tool.`;
  const description = "iLoveIMG's Convert tool page";
  const winner = resolveMarkerTarget(`${sectionContext} ${description}`, RELATED_TOOL);

  assert.ok(winner, "expected a resolved target, got null (unresolved)");
  assert.equal(
    winner.kind,
    "external",
    "reordering which category sits closest to the marker must change the winner accordingly -- a genuine position comparison, not a fixed category preference"
  );
});

test("all three categories present: internal closest to the marker wins (completes the 3-way coverage)", () => {
  const sectionContext = `
## How to convert a video file

### 1. iLoveIMG

iLoveIMG's Convert tool works too.

### 2. On a Mac, use QuickTime

Already on a Mac? QuickTime's Export As handles it.

### 3. AI Convertly's converter

AI Convertly converts it in your browser, right here.

1. Drop your file onto the upload area.`;
  const description = "the upload area before a file is dropped in";
  const winner = resolveMarkerTarget(`${sectionContext} ${description}`, RELATED_TOOL);

  assert.ok(winner, "expected a resolved target, got null (unresolved)");
  assert.equal(winner.kind, "internal");
  assert.equal(winner.tool.slug, RELATED_TOOL);
});

test("no candidate present in section context resolves to null (unresolved), not a false match", () => {
  const sectionContext = `
## Formats explained

Containers and codecs are two different layers of a media file, and mixing
them up is why a renamed extension never actually fixes playback.

1. Check the extension.`;
  const description = "a diagram of a container wrapping a codec";
  const winner = resolveMarkerTarget(`${sectionContext} ${description}`, RELATED_TOOL);

  assert.equal(winner, null);
});

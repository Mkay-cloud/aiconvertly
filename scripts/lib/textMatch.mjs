/**
 * Shared by findInternalTool (capture-screenshots.mjs) and findExternalTool
 * (externalTools.mjs): both resolve a marker's target by finding which
 * candidate name's LAST occurrence in the section text sits closest to the
 * marker, on the theory that whichever tool was named most recently is the
 * one the following text (and screenshot) is actually about.
 *
 * That theory breaks when the "occurrence" is really just a passing
 * comparison -- "the same setting desktop tools like HandBrake expose
 * directly" names HandBrake, but the sentence (and its screenshot marker)
 * is still about AI Convertly's own slider. A real case of this shipped
 * live: compress-video-online.md's own "Quality slider" step mentioned
 * HandBrake exactly this way, and because that mention sat closer to the
 * marker than the section's actual established subject, three of AI
 * Convertly's own compress-video-tool screenshots got captured and
 * published as HandBrake's homepage instead (see the PR description).
 *
 * lastGenuineMentionIndex skips a candidate occurrence immediately preceded
 * by a comparison word/phrase ("like", "such as", "similar to", "unlike",
 * "compared to", "the same as", "just like", "rather than", "instead of",
 * "as opposed to") and keeps searching backward for an earlier, genuine
 * occurrence -- so a tool mentioned ONLY in passing never resolves a
 * marker, but a tool that's also named as the actual subject elsewhere in
 * the same section (its own heading, its own "go to x.com" instruction)
 * still wins normally.
 */
const COMPARISON_LOOKBEHIND_RE =
  /\b(like|such as|similar to|unlike|compared to|comparable to|the same as|just like|rather than|as opposed to|instead of)\s*$/i;
// How far back to look for a comparison word before a candidate match --
// long enough for "compared to", short enough not to accidentally catch an
// unrelated "like" from an earlier, unconnected clause.
const LOOKBEHIND_WINDOW = 24;

export function lastGenuineMentionIndex(lowerText, needle) {
  let searchEnd = lowerText.length;
  for (;;) {
    const idx = lowerText.lastIndexOf(needle, searchEnd - 1);
    if (idx === -1) return -1;
    const before = lowerText.slice(Math.max(0, idx - LOOKBEHIND_WINDOW), idx);
    if (COMPARISON_LOOKBEHIND_RE.test(before)) {
      // Just a comparison aside, not the actual subject -- keep looking
      // further back (strictly before this occurrence's start) for a
      // genuine mention instead of stopping here.
      searchEnd = idx;
      continue;
    }
    return idx;
  }
}

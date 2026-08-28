# AI Convertly — Content Writing Guide

The standing reference for every article written for AI Convertly, whether drafted by Cowork, Claude Code, or a human. Built from real decisions made across this project, not generic advice.

## 1. The Reader

Someone with a specific, broken task in front of them right now: a file that won't open, needs to be smaller, or needs to be a different format for something due soon. They searched the exact problem, not the general topic — that's not a stylistic assumption, it's what real Bing keyword data shows: "resize image in kb" and "resize image" are genuinely different searches with different intent, not the same person phrasing things two ways.

They've likely already hit one frustrating "free" tool that wasn't. They'll leave the instant something feels like it's stalling the actual answer.

## 2. Voice

Direct and useful first, personality second. Trust is earned by solving the problem fast, not by charm.

- Have real opinions. If one tool is clearly better for a specific case, say so and say why — don't default to "it depends."
- Acknowledge friction honestly, the way this site is honest about its own limits (HEVC being unreliable, WebM not playing on iPhone, processing time varying).
- Contractions, varied sentence rhythm, no stiff how-to-manual tone.

## 3. Writing Tells to Avoid

Every one of these reads as generated, not written. Check for them before anything ships.

- No em dashes. Use a period, a comma, or restructure the sentence.
- No template openers: "In today's digital world...", "Whether you're a beginner or a pro...", "In this article, we'll cover..." — just start with the actual problem.
- No hollow superlatives ("amazing," "game-changing," "seamless") unless immediately backed by a specific reason.
- No hedge-everything language ("it depends," "in some cases," "may vary") used to avoid saying anything real. If something is true most of the time, say that.
- No perfectly uniform paragraph rhythm. Real writing has a short sentence next to a longer one.
- No forced completeness — not every paragraph needs a neat wrap-up sentence.

## 4. SEO — How This Actually Works Here

- Every topic in content/blog/CALENDAR.md has real target keywords attached, pulled from actual Bing Webmaster Tools data (impressions + trend spike), not guessed. Use them naturally in the title, one early paragraph, and at least one subheading — with natural variation ("resize" / "shrink" / "make smaller"), not exact-match repetition.
- This site targets long-tail and question-phrased searches on purpose, not head terms — there's no competing with an established, high-authority converter site for a broad term like "pdf converter." Every article should read like it's answering one specific, well-defined question someone actually typed.
- Title: primary keyword near the front, kept close to 60 characters.
- Meta description: one genuine, specific sentence describing what the article delivers, roughly 150-160 characters — not a restated title, not clickbait.
- Headers (H2/H3) should be real questions or specific steps, not generic labels like "Overview."
- Internal links matter: link to the specific relevant tool page with natural anchor text, and to other genuinely related articles as they exist — reinforcing the site's dedicated-page-per-search-term strategy, not working against it with vague, unlinked prose.
- When an article names a direct competitor (another file-conversion/media tool), describe it honestly but don't hyperlink it — name-only mention, keeping visitors on-site. Genuinely non-competing reference sources (official OS/software documentation, not a rival converter) may still be linked when they support a factual claim. The site's own tools are a separate case and should always be linked normally.
- Title and description also populate the BlogPosting structured data built into every article page — a vague title/description weakens the machine-readable layer too, not just the human-facing one.

## 5. Content Depth and Comprehensiveness

- Cover every genuinely good solution to the problem, not just AI Convertly's. AI Convertly's tool goes first and gets the fullest treatment when one genuinely applies — but the article should read as the actual best resource on the topic, honestly covering competitors and built-in OS options too.
- Order solutions from quickest/easiest to most involved, not randomly — respect the reader's time by offering the cheap fix first. Exception: AI Convertly's own tool, when it genuinely applies, always goes first regardless of whether it's the fastest or most convenient option — this takes priority over the quickest-first rule whenever the two would conflict.
- Briefly explain the likely cause before diving into fixes, so the reader understands what's actually happening, not just steps to follow blindly.
- Real, followable steps with exact UI paths and keystrokes ("Press Ctrl+Shift+Del, check Cookies and site data, click Clear data"), never vague ("simply clear your cache").
- For a genuinely multi-part fix, use nested step numbering (5.1, 5.1.1, 5.2...) rather than flattening everything into one long list.
- Mark a screenshot at every UI action a reader would need to visually confirm, inline as you write: [SCREENSHOT: exact moment/state to capture]. This directly feeds the automated screenshot capture built into publishing — no markers means no images. Cadence should be tight: nearly every distinct step, not just a few high-level checkpoints.
- Never fabricate a statistic, review count, or "trusted by X users" claim — this mirrors the site's own structured data deliberately excluding fake ratings rather than inventing trust signals.
- Don't describe a feature that doesn't exist yet on the site.

## 6. What Not to Do

This niche already has a real, observed problem worth naming directly: several existing small sites run thin, sales-y "vs the big paid converters" content with bullet-pointed "Winner: us!" declarations and aggressive competitor-bashing. That reads as generated, low-effort content. The differentiation here is being genuinely more thorough and honest, not copying the format with better branding.

- No affiliate-style "Quick Tip: switch to X" callout boxes — wrong monetization model for this site (ad-based, not affiliate), and it undercuts the comprehensive, non-sales-y positioning.
- No fabricated author persona or bio (a fake named "expert" with invented hobbies/credentials). A real author byline may be added later — that's a separate, deliberate decision, not something to invent by default.

## 7. Authorship Policy

Content stays neutral on how it was produced — in both directions.

- Never state or imply, anywhere in an article, that it was written or generated by AI.
- Never state or imply that it was personally written by a specific human, unless a real, deliberate byline policy is in place — which is a separate, explicit decision, not a default.

In short: don't volunteer how the content was made, and don't fabricate a claim about it either. Silence, not a false statement in either direction.

## 8. Structure

- Length follows the topic's real complexity — don't pad, don't cut a genuinely useful step short. A simple explainer might be 500 words; a full multi-tool comparison with steps for each might run well past 1,200.
- No fixed template opening or closing — every article finds its own way into the topic.
- Required frontmatter: title, description, slug, publishDate, category, relatedTool (omit if none genuinely applies).

/**
 * Hard limits for capture-screenshots.mjs's external-site driving, enforced
 * in code (not just as instructions to follow): never enter real payment
 * information, never create an account with personal information, never
 * attempt to bypass a CAPTCHA or bot-detection challenge. These checks run
 * before any interaction beyond a plain page load/screenshot, on every
 * external page the script visits.
 */

const CAPTCHA_PATTERNS = [
  /recaptcha/i,
  /hcaptcha/i,
  /cf-turnstile/i,
  /verify you.?re (a )?human/i,
  /are you a robot/i,
  /checking your browser/i,
  /captcha/i,
];

const PAYMENT_FIELD_PATTERNS = [
  /card.?number/i,
  /\bcvv\b/i,
  /\bcvc\b/i,
  /card.?expir/i,
  /billing.?address/i,
];

/**
 * True if the current page shows a CAPTCHA / bot-detection challenge.
 * Checked against both the page's visible text and any iframe src/title
 * (reCAPTCHA and hCaptcha both render inside an iframe, so their own
 * content is invisible to a page.textContent() check on the parent page).
 */
export async function pageHasCaptcha(page) {
  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (CAPTCHA_PATTERNS.some((re) => re.test(bodyText))) return true;

  const frames = page.frames();
  for (const frame of frames) {
    const url = frame.url();
    if (CAPTCHA_PATTERNS.some((re) => re.test(url))) return true;
  }
  return false;
}

/** True if the page has a real payment form (card number/CVV/etc. fields) currently visible. */
export async function pageHasPaymentForm(page) {
  const inputs = await page.locator("input").all();
  for (const input of inputs) {
    const attrs = await input.evaluate((el) =>
      [el.name, el.id, el.placeholder, el.getAttribute("aria-label")].filter(Boolean).join(" ")
    ).catch(() => "");
    if (PAYMENT_FIELD_PATTERNS.some((re) => re.test(attrs))) return true;
  }
  return false;
}

/**
 * True if the page is an account-creation wall: a password field alongside
 * an email field is the standard signup-form shape. A plain login form
 * (which we'd never fill in anyway, since we have no real account) matches
 * too, which is fine -- the goal is only ever to detect and stay off these
 * forms, not to distinguish login from signup.
 */
export async function pageHasSignupWall(page) {
  const hasPassword = (await page.locator('input[type="password"]').count()) > 0;
  if (!hasPassword) return false;
  const hasEmail =
    (await page.locator('input[type="email"], input[name*="email" i]').count()) > 0;
  return hasEmail;
}


const LOCATION_LEAK_PATTERNS = [
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/, // a bare IPv4 address rendered on the page
  /\b(?:your\s+)?ip\s*address\s*:?\s*\S/i,
  // A labeled "Location:"/"City:" field naming something -- this is
  // deliberately broad enough to also match unrelated copy like "File
  // location: Downloads folder". That's an acceptable false positive:
  // worst case it skips a real screenshot in favor of an illustration.
  // The one case it must never miss is a bare results-table field (no
  // "your"/"detected" qualifier) naming a real place, which is exactly
  // the shape fast.com's own leaked "Location: Ikoyi, NG" took.
  /\b(?:your\s+)?(?:location|city)\s*:\s*\S/i,
  /\bisp\s*:\s*\S/i,
  /your (?:location|city|isp|network|connection)\b/i,
  /(?:detected|estimated|approximate) location/i,
  /\blat(?:itude)?[:,]\s*-?\d/i,
];

/**
 * True if the page appears to display information tied to the *real*
 * machine doing the capture -- its IP address, ISP, or an auto-detected
 * city/location -- rather than content that would be identical for every
 * visitor. This is exactly what happened once on Techiebull: a real
 * screenshot of a speed-test tool captured its auto-detected "Ikoyi, NG"
 * location string, publishing the capturing machine's real physical
 * location on a public article without anyone intending to. Network-
 * diagnostic and "what's my IP" style tools are the main risk category,
 * but this check runs on every external page regardless, since there's
 * no reliable way to know in advance which tools do this.
 */
export async function pageLeaksLocationInfo(page) {
  const bodyText = await page.locator("body").innerText().catch(() => "");
  return LOCATION_LEAK_PATTERNS.some((re) => re.test(bodyText));
}

/**
 * Runs every check and returns a human-readable reason if the current page
 * is unsafe to interact with further (a plain screenshot of this state is
 * still fine -- it's the same as a human landing here manually; what's
 * disallowed is filling in these forms or working around a challenge).
 */
export async function unsafeReason(page) {
  if (await pageHasCaptcha(page)) return "hit a CAPTCHA / bot-detection challenge";
  if (await pageHasPaymentForm(page)) return "reached a real payment form";
  if (await pageHasSignupWall(page)) return "reached an account-creation/login wall";
  return null;
}

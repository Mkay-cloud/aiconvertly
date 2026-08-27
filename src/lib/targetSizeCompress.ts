import type { ImageFormatId } from "./imageFormats";
import { encodeImage } from "./encodeImage";
import { resizeCanvas } from "./canvasImage";

// Only jpeg/webp are ever passed in here (see ImageCompressorClient's
// outputFormat) -- both support a quality parameter, which this whole
// search is built around. PNG's compression is lossless and ignores
// quality entirely, so a target-size search over it wouldn't do anything.
type TargetSizeFormat = Extract<ImageFormatId, "jpeg" | "webp">;

export type TargetSizeProgress = {
  attempt: number;
  maxAttempts: number;
  quality: number;
  sizeBytes: number;
  phase: "quality" | "resize";
  width: number;
  height: number;
};

export type TargetSizeResult = {
  blob: Blob;
  quality: number;
  width: number;
  height: number;
  /** Within MAX_ITERATIONS attempts, whether the best result found is at or reasonably close to targetBytes. */
  reachedTarget: boolean;
  /** True once the algorithm had to shrink pixel dimensions -- quality alone couldn't reach the target. */
  wasResized: boolean;
};

const MIN_QUALITY = 1;
const MAX_QUALITY = 100;
// ceil(log2(100)) = 7 -- enough binary-search steps to land on the exact
// integer quality where the encoded size crosses the target, for the full
// 1-100 range the manual slider also uses.
const QUALITY_ITERATIONS = 7;
// Each resize step tries a full quality search again, so this bounds total
// work to QUALITY_ITERATIONS * (1 + MAX_RESIZE_STEPS) <= 56 encodes --
// bounded and fast even on a large photo, and the actual cap that keeps an
// unreachable target (e.g. 1 KB on a large photo) from looping forever
// rather than any size-based heuristic.
const MAX_RESIZE_STEPS = 7;
const RESIZE_SCALE_STEP = 0.82;
// Below this, an image stops being a meaningful photo -- this is the floor
// the resize fallback stops at, not a claim that the target is reachable
// there.
const MIN_DIMENSION = 40;
// "Close to the target" per the tool's own spec -- allows landing up to
// 10% over when nothing under the target was reachable, without pretending
// a wildly-off result "reached" it.
const TOLERANCE = 0.1;

type Candidate = { blob: Blob; quality: number; width: number; height: number };

/** Prefers a candidate at-or-under target (respecting a hard upload cap is the real use case) over one above it; among same-side candidates, the closer one wins. */
function isBetter(candidate: Candidate, current: Candidate | null, targetBytes: number): boolean {
  if (!current) return true;
  const candidateOver = candidate.blob.size > targetBytes;
  const currentOver = current.blob.size > targetBytes;
  if (candidateOver !== currentOver) return !candidateOver;
  return Math.abs(candidate.blob.size - targetBytes) < Math.abs(current.blob.size - targetBytes);
}

async function searchQualityAtSize(
  canvas: HTMLCanvasElement,
  format: TargetSizeFormat,
  targetBytes: number,
  phase: "quality" | "resize",
  attemptState: { count: number; max: number },
  onProgress?: (progress: TargetSizeProgress) => void
): Promise<Candidate> {
  let lo = MIN_QUALITY;
  let hi = MAX_QUALITY;
  let best: Candidate | null = null;
  for (let i = 0; i < QUALITY_ITERATIONS && lo <= hi; i++) {
    const quality = Math.round((lo + hi) / 2);
    const blob = await encodeImage(canvas, format, quality);
    attemptState.count += 1;
    const candidate: Candidate = { blob, quality, width: canvas.width, height: canvas.height };
    onProgress?.({
      attempt: attemptState.count,
      maxAttempts: attemptState.max,
      quality,
      sizeBytes: blob.size,
      phase,
      width: canvas.width,
      height: canvas.height,
    });
    if (isBetter(candidate, best, targetBytes)) best = candidate;
    if (blob.size > targetBytes) hi = quality - 1;
    else lo = quality + 1;
  }
  // lo > hi can't happen on the first iteration (loop always runs once),
  // so best is always assigned.
  return best!;
}

/**
 * Iteratively searches for a quality level (and, if that alone isn't
 * enough, progressively smaller pixel dimensions) that gets an encoded
 * image close to targetBytes. Entirely client-side -- each attempt is a
 * real canvas encode, not an estimate, so the reported result is the
 * actual achievable size, not a guess.
 */
export async function compressToTargetSize(
  sourceCanvas: HTMLCanvasElement,
  format: TargetSizeFormat,
  targetBytes: number,
  onProgress?: (progress: TargetSizeProgress) => void
): Promise<TargetSizeResult> {
  const attemptState = { count: 0, max: QUALITY_ITERATIONS * (1 + MAX_RESIZE_STEPS) };

  let best = await searchQualityAtSize(sourceCanvas, format, targetBytes, "quality", attemptState, onProgress);
  if (best.blob.size <= targetBytes * (1 + TOLERANCE)) {
    return { blob: best.blob, quality: best.quality, width: best.width, height: best.height, reachedTarget: true, wasResized: false };
  }

  // Quality reduction alone couldn't get under the target even at its
  // floor -- fall back to shrinking pixel dimensions too, the same move
  // the dedicated target-KB tools referenced in this site's own
  // "Resize a Photo to an Exact KB Size" article make for very tight
  // limits like 20 KB. Each step re-runs the full quality search at the
  // new, smaller canvas, since the quality/size curve shifts with
  // dimensions.
  let resized = false;
  let scale = 1;
  for (let step = 0; step < MAX_RESIZE_STEPS; step++) {
    scale *= RESIZE_SCALE_STEP;
    const width = Math.max(MIN_DIMENSION, Math.round(sourceCanvas.width * scale));
    const height = Math.max(MIN_DIMENSION, Math.round(sourceCanvas.height * scale));
    const workingCanvas = resizeCanvas(sourceCanvas, width, height);
    resized = true;
    const candidate = await searchQualityAtSize(workingCanvas, format, targetBytes, "resize", attemptState, onProgress);
    if (isBetter(candidate, best, targetBytes)) best = candidate;
    if (best.blob.size <= targetBytes * (1 + TOLERANCE)) break;
    if (width <= MIN_DIMENSION && height <= MIN_DIMENSION) break; // hit the floor, no point shrinking further
  }

  return {
    blob: best.blob,
    quality: best.quality,
    width: best.width,
    height: best.height,
    reachedTarget: best.blob.size <= targetBytes * (1 + TOLERANCE),
    wasResized: resized,
  };
}

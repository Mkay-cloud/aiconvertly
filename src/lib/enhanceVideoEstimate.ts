import { TILE_SIZE } from "./enhanceImageTiling";

/**
 * Rough, deliberately wide range (not a false-precision single number) for
 * how long one tile takes to run through the AI model -- based on the
 * per-tile timings actually observed while building and testing the image
 * enhancer (roughly 1-4s depending on device and whether WebGPU or WASM
 * ends up being used). Real speed varies a lot by device, so this is
 * framed to the visitor as an estimate, not a promise.
 */
const SECONDS_PER_TILE_LOW = 1;
const SECONDS_PER_TILE_HIGH = 4;

export function tilesPerFrame(width: number, height: number): number {
  return Math.ceil(width / TILE_SIZE) * Math.ceil(height / TILE_SIZE);
}

export function estimateEnhanceSeconds(
  frameCount: number,
  width: number,
  height: number
): { low: number; high: number } {
  const totalTiles = tilesPerFrame(width, height) * frameCount;
  return { low: totalTiles * SECONDS_PER_TILE_LOW, high: totalTiles * SECONDS_PER_TILE_HIGH };
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  const minutes = seconds / 60;
  if (minutes < 10) return `${minutes.toFixed(1)} min`;
  return `${Math.round(minutes)} min`;
}

export function formatSecondsRange(low: number, high: number): string {
  return `${formatSeconds(low)}–${formatSeconds(high)}`;
}

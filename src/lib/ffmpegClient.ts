import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { FfmpegOutputError } from "./ffmpegIO";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;
let currentProgressCb: ((percent: number) => void) | null = null;

// Generous but bounded: the wasm core is ~32MB, so a slow-but-working
// connection can legitimately take a while. This bounds how long we wait
// before concluding a load attempt is genuinely stuck (as opposed to just
// slow) -- e.g. a stalled fetch or the ffmpeg.load() handshake never
// resolving. Without this, that failure mode hangs the UI at "Loading
// converter... 0%" indefinitely with no way to ever show an error, since
// nothing ever rejects.
const LOAD_TIMEOUT_MS = 90_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function attemptLoad(ffmpeg: FFmpeg): Promise<void> {
  const { toBlobURL } = await import("@ffmpeg/util");
  const baseURL = "/ffmpeg";

  const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
  const wasmURL = await toBlobURL(
    `${baseURL}/ffmpeg-core.wasm`,
    "application/wasm",
    true,
    ({ received, total }) => {
      if (total > 0) currentProgressCb?.(Math.round((received / total) * 100));
    }
  );

  await ffmpeg.load({
    coreURL,
    wasmURL,
    // @ffmpeg/ffmpeg's own worker.js does a runtime `import(coreURL)`
    // with a blob: URL, which webpack intercepts and fails to resolve
    // ("Cannot find module 'blob:...'") when the worker is bundled
    // normally. Loading a self-hosted, unbundled copy sidesteps
    // webpack's module system for the worker entirely. A fully
    // qualified URL is required here -- `new URL(path, import.meta.url)`
    // resolves against a bogus file:// base inside webpack's bundle.
    classWorkerURL: `${window.location.origin}/ffmpeg/worker.js`,
  });
}

export async function loadFFmpeg(
  onLoadProgress?: (percent: number) => void
): Promise<FFmpeg> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");

  if (!ffmpegInstance) ffmpegInstance = new FFmpeg();

  if (ffmpegInstance.loaded) return ffmpegInstance;

  currentProgressCb = onLoadProgress ?? null;

  if (!loadPromise) {
    // Captured so the cleanup below can tell whether it's still cleaning up
    // *this* attempt by the time it runs, rather than a newer one -- resetFFmpeg()
    // (called by every tool's Cancel) can null out the module-level
    // ffmpegInstance/loadPromise and start a fresh load while this attempt's
    // own rejection is still in flight; without this guard, this attempt's
    // delayed cleanup would then clobber that fresh, unrelated load.
    const instance = ffmpegInstance!;
    const attempt: Promise<void> = (async () => {
      try {
        await withTimeout(attemptLoad(instance), LOAD_TIMEOUT_MS);
      } catch {
        throw new FfmpegOutputError(
          "The converter is taking too long to load. Check your connection and try again."
        );
      }
    })().catch((err) => {
      // Reset module state on any failure so the *next* attempt (e.g. the
      // visitor clicking the button again) starts completely fresh
      // instead of forever re-awaiting this same rejected promise --
      // otherwise one failed load would permanently break the tool for
      // the rest of the page's lifetime.
      if (loadPromise === attempt) loadPromise = null;
      if (ffmpegInstance === instance) ffmpegInstance = null;
      try {
        instance.terminate();
      } catch {
        // Already dead -- nothing to clean up.
      }
      throw err;
    });
    loadPromise = attempt;
  }

  await loadPromise;
  return ffmpegInstance;
}

/**
 * A hard WASM trap (e.g. "RuntimeError: memory access out of bounds", which
 * this ffmpeg-core build is known to throw for a handful of unstable codec
 * paths) can leave the underlying wasm instance corrupted for any further
 * operation, not just the one that triggered it. Call this after such a
 * crash so the *next* attempt gets a genuinely fresh worker/instance
 * instead of silently reusing a broken one -- otherwise every subsequent
 * conversion on the page would fail too, even with a perfectly fine file.
 */
export function resetFFmpeg(): void {
  try {
    ffmpegInstance?.terminate();
  } catch {
    // Already dead -- nothing to clean up.
  }
  ffmpegInstance = null;
  loadPromise = null;
  currentProgressCb = null;
}

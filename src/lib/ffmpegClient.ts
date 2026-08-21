import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { FfmpegOutputError } from "./ffmpegIO";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;
let currentProgressCb: ((percent: number) => void) | null = null;

// Generous but bounded: the wasm core is ~32MB, so a slow-but-working
// connection can legitimately take a while. These bound how long we wait
// before concluding a load attempt is genuinely stuck (as opposed to just
// slow) -- e.g. some intermediary between the visitor and Vercel altering
// headers or subresource responses in a way that leaves a fetch or the
// ffmpeg.load() handshake pending forever. Without this, that failure mode
// hangs the UI at "Loading converter... 0%" indefinitely with no way to
// ever show an error, since nothing ever rejects.
const MULTI_THREAD_LOAD_TIMEOUT_MS = 45_000;
const SINGLE_THREAD_LOAD_TIMEOUT_MS = 90_000;

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

async function attemptLoad(ffmpeg: FFmpeg, useMultiThread: boolean): Promise<void> {
  const { toBlobURL } = await import("@ffmpeg/util");
  const baseURL = useMultiThread ? "/ffmpeg-mt" : "/ffmpeg";

  const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
  const wasmURL = await toBlobURL(
    `${baseURL}/ffmpeg-core.wasm`,
    "application/wasm",
    true,
    ({ received, total }) => {
      if (total > 0) currentProgressCb?.(Math.round((received / total) * 100));
    }
  );
  const workerURL = useMultiThread
    ? await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript")
    : undefined;

  await ffmpeg.load({
    coreURL,
    wasmURL,
    ...(workerURL ? { workerURL } : {}),
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
    loadPromise = (async () => {
      try {
        // The multi-threaded ffmpeg-core build uses all available CPU
        // cores instead of one -- a several-times speedup on the video
        // encodes these tools do. It needs SharedArrayBuffer, which only
        // exists when the page is cross-origin isolated (COOP/COEP
        // headers, set site-wide in next.config.ts since every resource
        // here is already same-origin).
        const wantsMultiThread =
          typeof window !== "undefined" &&
          window.crossOriginIsolated === true &&
          typeof SharedArrayBuffer !== "undefined";

        if (wantsMultiThread) {
          try {
            await withTimeout(
              attemptLoad(ffmpegInstance!, true),
              MULTI_THREAD_LOAD_TIMEOUT_MS
            );
            return;
          } catch {
            // The multi-threaded core didn't finish loading in a
            // reasonable time (or errored outright). Rather than leave
            // the visitor stuck forever, discard the possibly
            // half-initialized instance/worker -- reusing it for a
            // second load() call isn't safe -- and retry cleanly with
            // the single-threaded core on a fresh instance.
            try {
              ffmpegInstance?.terminate();
            } catch {
              // Already dead -- nothing to clean up.
            }
            ffmpegInstance = new FFmpeg();
            currentProgressCb?.(0);
          }
        }

        try {
          await withTimeout(
            attemptLoad(ffmpegInstance!, false),
            SINGLE_THREAD_LOAD_TIMEOUT_MS
          );
        } catch {
          throw new FfmpegOutputError(
            "The converter is taking too long to load. Check your connection and try again."
          );
        }
      } catch (err) {
        // Reset module state on any failure so the *next* attempt (e.g.
        // the visitor clicking the button again) starts completely fresh
        // instead of forever re-awaiting this same rejected promise --
        // otherwise one failed load would permanently break the tool for
        // the rest of the page's lifetime.
        loadPromise = null;
        try {
          ffmpegInstance?.terminate();
        } catch {
          // Already dead -- nothing to clean up.
        }
        ffmpegInstance = null;
        throw err;
      }
    })();
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

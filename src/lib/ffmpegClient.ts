import type { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;
let currentProgressCb: ((percent: number) => void) | null = null;

export async function loadFFmpeg(
  onLoadProgress?: (percent: number) => void
): Promise<FFmpeg> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");

  if (!ffmpegInstance) ffmpegInstance = new FFmpeg();
  const ffmpeg = ffmpegInstance;

  if (ffmpeg.loaded) return ffmpeg;

  currentProgressCb = onLoadProgress ?? null;

  if (!loadPromise) {
    loadPromise = (async () => {
      // The multi-threaded ffmpeg-core build uses all available CPU cores
      // instead of one -- a several-times speedup on the video encodes
      // these tools do. It needs SharedArrayBuffer, which only exists when
      // the page is cross-origin isolated (COOP/COEP headers, set site-wide
      // in next.config.ts since every resource here is already
      // same-origin). Fall back to the single-threaded core if that's ever
      // not true (e.g. an intermediary strips the headers) instead of
      // failing outright.
      const useMultiThread =
        typeof window !== "undefined" &&
        window.crossOriginIsolated === true &&
        typeof SharedArrayBuffer !== "undefined";
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
    })();
  }

  await loadPromise;
  return ffmpeg;
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

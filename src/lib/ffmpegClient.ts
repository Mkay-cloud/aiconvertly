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
    })();
  }

  await loadPromise;
  return ffmpeg;
}

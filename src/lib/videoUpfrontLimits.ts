import { formatBytes } from "./format";

/**
 * Hard limits for Enhance Video Quality, checked *before* any real work
 * starts (not ffmpeg, not the AI model) so a video that doesn't qualify is
 * rejected in milliseconds with a clear reason, not discovered minutes into
 * a per-frame AI run. Every frame gets individually processed by the same
 * model as the image enhancer, so these are deliberately tight compared to
 * the other video tools.
 */
export const MAX_DURATION_SECONDS = 10;
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
// Matches enhance-image-quality's own MAX_INPUT_DIMENSION -- each frame
// goes through the exact same tiling pipeline, so the same canvas-size/
// memory safety reasoning applies per frame.
export const MAX_FRAME_DIMENSION = 1500;

export type VideoLimitCheck = { ok: true } | { ok: false; reason: string };

export function checkFileSize(file: File): VideoLimitCheck {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      reason: `This file is ${formatBytes(file.size)}. Enhance Video Quality processes every frame with an AI model, so it's limited to files up to ${formatBytes(
        MAX_FILE_SIZE_BYTES
      )}. Try trimming it first with the Trim Video/Audio tool.`,
    };
  }
  return { ok: true };
}

export function checkDuration(durationSeconds: number): VideoLimitCheck {
  if (durationSeconds > MAX_DURATION_SECONDS) {
    return {
      ok: false,
      reason: `This video is ${durationSeconds.toFixed(1)}s long. Enhance Video Quality processes every frame with an AI model, so it's limited to clips up to ${MAX_DURATION_SECONDS} seconds. Try trimming it first with the Trim Video/Audio tool.`,
    };
  }
  return { ok: true };
}

export function checkFrameDimensions(width: number, height: number): VideoLimitCheck {
  if (width > MAX_FRAME_DIMENSION || height > MAX_FRAME_DIMENSION) {
    return {
      ok: false,
      reason: `This video's frames are ${width} × ${height}px. Each frame goes through the same AI model as the Enhance Image Quality tool, which is limited to ${MAX_FRAME_DIMENSION}px on each side — try a lower-resolution clip.`,
    };
  }
  return { ok: true };
}

export type VideoMetadata = { duration: number; width: number; height: number };

/**
 * Reads duration and frame dimensions from a video file using the browser's
 * native <video> element -- fast (just enough of the container to get
 * metadata) and, critically, doesn't require loading ffmpeg.wasm at all,
 * so an oversized/too-long video is rejected without ever touching it.
 */
export function readVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const url = URL.createObjectURL(file);

    function cleanup() {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    }

    video.onloadedmetadata = () => {
      const metadata = { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
      cleanup();
      resolve(metadata);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Couldn't read this video. It may be corrupted or in an unsupported format."));
    };
    video.src = url;
  });
}

/**
 * Runs every upfront check in order, cheapest first, stopping at the first
 * failure -- a file that's simply too big is rejected without ever
 * creating a <video> element to check its duration.
 */
export async function validateVideoUpfront(
  file: File
): Promise<{ ok: true; metadata: VideoMetadata } | { ok: false; reason: string }> {
  const sizeCheck = checkFileSize(file);
  if (!sizeCheck.ok) return sizeCheck;

  const metadata = await readVideoMetadata(file);

  const durationCheck = checkDuration(metadata.duration);
  if (!durationCheck.ok) return durationCheck;

  const dimensionCheck = checkFrameDimensions(metadata.width, metadata.height);
  if (!dimensionCheck.ok) return dimensionCheck;

  return { ok: true, metadata };
}

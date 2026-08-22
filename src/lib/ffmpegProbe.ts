import type { FFmpeg } from "@ffmpeg/ffmpeg";

export type MediaProbe = {
  hasAudio: boolean;
  duration: number;
  /** Video stream frame rate, or 0 if this input has no video stream. */
  fps: number;
  /** Video stream dimensions, or 0/0 if this input has no video stream. */
  width: number;
  height: number;
};

/**
 * ffmpeg.wasm doesn't ship a separate ffprobe binary we can parse JSON from,
 * but `ffmpeg -i <file>` (with no output) always prints stream info to its
 * log before erroring out with "At least one output file must be
 * specified" -- so we scrape that instead. Used to build filter graphs that
 * adapt to what a given input actually has (e.g. a video with no audio
 * track), rather than assuming every input looks like our test fixtures,
 * and (fps/width/height) to compute a real frame count for the video
 * enhancer before it starts extracting frames.
 */
export async function probeMedia(ffmpeg: FFmpeg, inputName: string): Promise<MediaProbe> {
  let hasAudio = false;
  let duration = 0;
  let fps = 0;
  let width = 0;
  let height = 0;
  const onLog = ({ message }: { message: string }) => {
    if (/Stream #\d+:\d+.*:\s*Audio:/.test(message)) hasAudio = true;
    const durationMatch = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(message);
    if (durationMatch) {
      duration = Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3]);
    }
    if (/Stream #\d+:\d+.*:\s*Video:/.test(message)) {
      const sizeMatch = /(?:^|[\s,])(\d{2,5})x(\d{2,5})(?:[\s,]|$)/.exec(message);
      if (sizeMatch) {
        width = Number(sizeMatch[1]);
        height = Number(sizeMatch[2]);
      }
      const fpsMatch = /(\d+(?:\.\d+)?)\s+fps/.exec(message);
      if (fpsMatch) fps = Number(fpsMatch[1]);
    }
  };
  ffmpeg.on("log", onLog);
  await ffmpeg.exec(["-i", inputName]);
  ffmpeg.off("log", onLog);
  return { hasAudio, duration, fps, width, height };
}

import type { FFmpeg } from "@ffmpeg/ffmpeg";

export type MediaProbe = { hasAudio: boolean; duration: number };

/**
 * ffmpeg.wasm doesn't ship a separate ffprobe binary we can parse JSON from,
 * but `ffmpeg -i <file>` (with no output) always prints stream info to its
 * log before erroring out with "At least one output file must be
 * specified" -- so we scrape that instead. Used to build filter graphs that
 * adapt to what a given input actually has (e.g. a video with no audio
 * track), rather than assuming every input looks like our test fixtures.
 */
export async function probeMedia(ffmpeg: FFmpeg, inputName: string): Promise<MediaProbe> {
  let hasAudio = false;
  let duration = 0;
  const onLog = ({ message }: { message: string }) => {
    if (/Stream #\d+:\d+.*:\s*Audio:/.test(message)) hasAudio = true;
    const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(message);
    if (match) {
      duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    }
  };
  ffmpeg.on("log", onLog);
  await ffmpeg.exec(["-i", inputName]);
  ffmpeg.off("log", onLog);
  return { hasAudio, duration };
}

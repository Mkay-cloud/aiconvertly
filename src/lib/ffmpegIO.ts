import type { FFmpeg } from "@ffmpeg/ffmpeg";

export async function writeInputFile(
  ffmpeg: FFmpeg,
  name: string,
  file: File
): Promise<void> {
  const data = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile(name, data);
}

export function inputFileName(file: File, fallbackExt: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  const ext = match ? match[1].toLowerCase() : fallbackExt;
  return `input.${ext}`;
}

/**
 * ffmpeg writes the MP4/MOV "moov" atom (the index browsers need before
 * they can start decoding) at the END of the file by default. Without
 * relocating it to the front, browsers' built-in media demuxers reliably
 * fail to play the result ("no supported streams") even though the file is
 * a fully valid, playable MP4/MOV by every other measure -- ffmpeg itself
 * parses it fine, and it passes byte-level container checks. This needs to
 * be on every command that writes an mp4/mov output, including
 * stream-copy (`-c copy`) ones.
 */
export function fastStartArgs(ext: string): string[] {
  return ext === "mp4" || ext === "mov" || ext === "m4v" ? ["-movflags", "+faststart"] : [];
}

/**
 * Base class for errors whose message is safe (and meant) to show a user
 * verbatim -- as opposed to raw ffmpeg/WASM failures (including hard WASM
 * traps like "RuntimeError: memory access out of bounds", which this build
 * is known to throw for a handful of unstable codec paths), which must
 * never reach the screen. See useFfmpegOperation's catch handler: only
 * FriendlyMediaError messages are ever shown directly; everything else
 * collapses to a single generic message.
 */
export class FriendlyMediaError extends Error {}

export class FfmpegOutputError extends FriendlyMediaError {
  constructor(
    message = "This conversion failed — try different files or a smaller file size."
  ) {
    super(message);
    this.name = "FfmpegOutputError";
  }
}

function bytesMatch(data: Uint8Array, offset: number, expected: number[]): boolean {
  if (data.length < offset + expected.length) return false;
  return expected.every((byte, i) => data[offset + i] === byte);
}

function asciiMatch(data: Uint8Array, offset: number, expected: string): boolean {
  return bytesMatch(
    data,
    offset,
    Array.from(expected, (c) => c.charCodeAt(0))
  );
}

/**
 * Magic-byte checks for every container/format the ffmpeg-based tools can
 * produce. ffmpeg.exec() can resolve "successfully" (return code 0) while
 * still writing a truncated or empty file -- e.g. some filter graph edge
 * cases silently no-op rather than erroring. These checks are the last line
 * of defense before a file reaches a user as a "successful" download.
 */
const CONTAINER_CHECKS: Record<string, (data: Uint8Array) => boolean> = {
  mp4: (d) => asciiMatch(d, 4, "ftyp"),
  mov: (d) => asciiMatch(d, 4, "ftyp"),
  m4v: (d) => asciiMatch(d, 4, "ftyp"),
  webm: (d) => bytesMatch(d, 0, [0x1a, 0x45, 0xdf, 0xa3]),
  mkv: (d) => bytesMatch(d, 0, [0x1a, 0x45, 0xdf, 0xa3]),
  mp3: (d) =>
    asciiMatch(d, 0, "ID3") || (d.length > 1 && d[0] === 0xff && (d[1] & 0xe0) === 0xe0),
  wav: (d) => asciiMatch(d, 0, "RIFF") && asciiMatch(d, 8, "WAVE"),
  ogg: (d) => asciiMatch(d, 0, "OggS"),
  gif: (d) => asciiMatch(d, 0, "GIF87a") || asciiMatch(d, 0, "GIF89a"),
};

/**
 * Runs an ffmpeg command and throws a clear, user-facing error if it didn't
 * exit cleanly, instead of silently continuing on to read a missing or
 * truncated output file. ffmpeg.exec() resolves with a return code rather
 * than rejecting on failure (0 = success), so every call site must check it
 * explicitly -- it's easy to miss.
 */
export async function execFfmpeg(ffmpeg: FFmpeg, args: string[]): Promise<void> {
  const code = await ffmpeg.exec(args);
  if (code !== 0) {
    throw new FfmpegOutputError();
  }
}

/**
 * Reads an ffmpeg output file and verifies it's non-empty and structurally
 * matches the format it claims to be before we ever offer it to the user as
 * a finished download. `format` should be a key of CONTAINER_CHECKS (falls
 * back to a non-empty check only if the format isn't recognized).
 */
export async function readAndValidateOutput(
  ffmpeg: FFmpeg,
  name: string,
  format: string
): Promise<Uint8Array> {
  const data = (await ffmpeg.readFile(name)) as Uint8Array;
  const check = CONTAINER_CHECKS[format];
  if (!data || data.length === 0 || (check && !check(data))) {
    throw new FfmpegOutputError();
  }
  return data;
}

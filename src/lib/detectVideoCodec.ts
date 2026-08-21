import { FriendlyMediaError } from "./ffmpegIO";

export type VideoCodecCheck = { supported: true } | { supported: false; codecLabel: string };

// ISOBMFF (MP4/MOV) sample-entry FourCCs known to crash this ffmpeg-core.wasm
// build with a hard WASM trap ("RuntimeError: memory access out of bounds"),
// confirmed with a real HEVC/H.265 file exported from CapCut.
const BLOCKED_ISOBMFF_CODECS: Record<string, string> = {
  hvc1: "HEVC (H.265)",
  hev1: "HEVC (H.265)",
  dvhe: "HEVC (H.265, Dolby Vision)",
  dvh1: "HEVC (H.265, Dolby Vision)",
};

function asciiAt(data: Uint8Array, offset: number, len: number): string {
  if (offset < 0 || offset + len > data.length) return "";
  let s = "";
  for (let i = 0; i < len; i += 1) s += String.fromCharCode(data[offset + i]);
  return s;
}

function readU32(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>>
    0
  );
}

function readU64(data: Uint8Array, offset: number): number {
  return readU32(data, offset) * 2 ** 32 + readU32(data, offset + 4);
}

type Box = { type: string; bodyStart: number; end: number };

function* iterBoxes(data: Uint8Array, start: number, end: number): Generator<Box> {
  let pos = start;
  while (pos + 8 <= end) {
    let size = readU32(data, pos);
    const type = asciiAt(data, pos + 4, 4);
    let bodyStart = pos + 8;
    if (size === 1) {
      if (pos + 16 > end) return;
      size = readU64(data, pos + 8);
      bodyStart = pos + 16;
    } else if (size === 0) {
      size = end - pos;
    }
    if (size < 8 || pos + size > end) return;
    yield { type, bodyStart, end: pos + size };
    pos += size;
  }
}

function findChild(data: Uint8Array, start: number, end: number, type: string): Box | null {
  for (const box of iterBoxes(data, start, end)) {
    if (box.type === type) return box;
  }
  return null;
}

/**
 * Walks ISOBMFF (MP4/MOV) box structure to find the *video* track's sample
 * description codec FourCC (e.g. "avc1" for H.264, "hvc1"/"hev1" for HEVC).
 * Only descends into a trak whose handler type is "vide" so an audio
 * track's codec never gets mistaken for the video codec. Returns null if
 * the file isn't ISOBMFF, is truncated, or no video track is found.
 */
function findIsobmffVideoCodec(data: Uint8Array): string | null {
  if (!findChild(data, 0, data.length, "ftyp")) return null;
  const moov = findChild(data, 0, data.length, "moov");
  if (!moov) return null;

  for (const trak of iterBoxes(data, moov.bodyStart, moov.end)) {
    if (trak.type !== "trak") continue;
    const mdia = findChild(data, trak.bodyStart, trak.end, "mdia");
    if (!mdia) continue;
    const hdlr = findChild(data, mdia.bodyStart, mdia.end, "hdlr");
    if (!hdlr) continue;
    // hdlr body: version(1) + flags(3) + pre_defined(4) + handler_type(4 ascii)
    const handlerType = asciiAt(data, hdlr.bodyStart + 8, 4);
    if (handlerType !== "vide") continue;

    const minf = findChild(data, mdia.bodyStart, mdia.end, "minf");
    const stbl = minf && findChild(data, minf.bodyStart, minf.end, "stbl");
    const stsd = stbl && findChild(data, stbl.bodyStart, stbl.end, "stsd");
    if (!stsd) continue;
    // stsd body: version(1) + flags(3) + entry_count(4), then the first
    // sample entry: size(4) + format(4 ascii).
    const entryStart = stsd.bodyStart + 8;
    if (entryStart + 8 > data.length) continue;
    return asciiAt(data, entryStart + 4, 4);
  }
  return null;
}

async function readPrefix(file: File, maxBytes = 4 * 1024 * 1024): Promise<Uint8Array> {
  const slice = file.slice(0, Math.min(file.size, maxBytes));
  return new Uint8Array(await slice.arrayBuffer());
}

function bytesIncludeAscii(data: Uint8Array, needle: string, scanBytes = 65536): boolean {
  const end = Math.min(data.length, scanBytes);
  let text = "";
  for (let i = 0; i < end; i += 1) text += String.fromCharCode(data[i]);
  return text.includes(needle);
}

/**
 * Detects whether a video file uses a codec known to crash this
 * ffmpeg-core.wasm build, entirely in JS -- no ffmpeg.wasm involved -- so
 * the detection itself can never trigger the crash it's trying to prevent.
 * Non-video files (audio, or anything the parser doesn't recognize) safely
 * report as supported.
 */
export async function checkVideoCodecSupport(file: File): Promise<VideoCodecCheck> {
  try {
    const prefix = await readPrefix(file);

    const fourCc = findIsobmffVideoCodec(prefix);
    if (fourCc && BLOCKED_ISOBMFF_CODECS[fourCc]) {
      return { supported: false, codecLabel: BLOCKED_ISOBMFF_CODECS[fourCc] };
    }

    // HEVC-in-Matroska/WebM is rare for real-world uploads, so a full EBML
    // walk isn't worth it -- the CodecID string is easy to spot directly.
    if (bytesIncludeAscii(prefix, "V_MPEGH/ISO/HEVC")) {
      return { supported: false, codecLabel: "HEVC (H.265)" };
    }

    return { supported: true };
  } catch {
    // If detection itself fails for any reason, don't block the user --
    // fall through to the normal ffmpeg path (still covered by the crash
    // safety net in useFfmpegOperation).
    return { supported: true };
  }
}

export class UnsupportedCodecError extends FriendlyMediaError {
  constructor(codecLabel: string, fileName?: string) {
    const subject = fileName ? `"${fileName}"` : "This video";
    super(
      `${subject} uses ${codecLabel} encoding, which isn't supported yet. Try re-exporting it as H.264 in your video editing app and upload again.`
    );
    this.name = "UnsupportedCodecError";
  }
}

/** Throws UnsupportedCodecError if the file's video codec is known-unsupported. */
export async function assertVideoCodecSupported(file: File): Promise<void> {
  const result = await checkVideoCodecSupport(file);
  if (!result.supported) {
    throw new UnsupportedCodecError(result.codecLabel);
  }
}

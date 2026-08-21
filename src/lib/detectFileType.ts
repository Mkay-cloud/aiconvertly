import type { ImageFormatId } from "./imageFormats";

export type VideoDetectedFormat = "mp4" | "webm" | "mov" | "mkv";
export type AudioDetectedFormat = "mp3" | "wav" | "ogg";

export type DetectedKind =
  | { category: "pdf"; format: "pdf"; label: string }
  | { category: "image"; format: ImageFormatId; label: string }
  | { category: "image"; format: "heic"; label: string }
  | { category: "video"; format: VideoDetectedFormat; label: string }
  | { category: "audio"; format: AudioDetectedFormat; label: string }
  | { category: "unknown"; format: null; label: string };

function bytesToAscii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function extensionOf(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : "";
}

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);
const AVIF_BRANDS = new Set(["avif", "avis"]);

export async function detectFileType(file: File): Promise<DetectedKind> {
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const ext = extensionOf(file.name);

  if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
    return { category: "pdf", format: "pdf", label: "PDF" };
  }

  if (bytesToAscii(header, 4, 4) === "ftyp") {
    const brand = bytesToAscii(header, 8, 4);
    if (HEIC_BRANDS.has(brand)) return { category: "image", format: "heic", label: "HEIC/HEIF" };
    if (AVIF_BRANDS.has(brand)) return { category: "image", format: "avif", label: "AVIF" };
    if (brand.startsWith("qt")) return { category: "video", format: "mov", label: "MOV" };
    // Any other ISOBMFF brand (isom, mp41, mp42, avc1, M4V , ...) is MP4-family.
    return { category: "video", format: "mp4", label: "MP4" };
  }

  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return { category: "image", format: "jpeg", label: "JPG" };
  }

  if (header[0] === 0x89 && bytesToAscii(header, 1, 3) === "PNG") {
    return { category: "image", format: "png", label: "PNG" };
  }

  if (bytesToAscii(header, 0, 4) === "RIFF" && bytesToAscii(header, 8, 4) === "WEBP") {
    return { category: "image", format: "webp", label: "WebP" };
  }

  if (bytesToAscii(header, 0, 4) === "RIFF" && bytesToAscii(header, 8, 4) === "WAVE") {
    return { category: "audio", format: "wav", label: "WAV" };
  }

  if (bytesToAscii(header, 0, 6) === "GIF87a" || bytesToAscii(header, 0, 6) === "GIF89a") {
    return { category: "image", format: "gif", label: "GIF" };
  }

  if (header[0] === 0x42 && header[1] === 0x4d) {
    return { category: "image", format: "bmp", label: "BMP" };
  }

  if (
    (header[0] === 0x49 && header[1] === 0x49 && header[2] === 0x2a && header[3] === 0x00) ||
    (header[0] === 0x4d && header[1] === 0x4d && header[2] === 0x00 && header[3] === 0x2a)
  ) {
    return { category: "image", format: "tiff", label: "TIFF" };
  }

  // EBML magic number: Matroska container family (WebM and MKV both use it;
  // they're only distinguished by the DocType element deeper in the file,
  // so fall back to the extension here).
  if (
    header[0] === 0x1a &&
    header[1] === 0x45 &&
    header[2] === 0xdf &&
    header[3] === 0xa3
  ) {
    return ext === "mkv"
      ? { category: "video", format: "mkv", label: "MKV" }
      : { category: "video", format: "webm", label: "WebM" };
  }

  if (bytesToAscii(header, 0, 4) === "OggS") {
    return { category: "audio", format: "ogg", label: "OGG" };
  }

  if (
    bytesToAscii(header, 0, 3) === "ID3" ||
    (header[0] === 0xff && (header[1] & 0xe0) === 0xe0)
  ) {
    return { category: "audio", format: "mp3", label: "MP3" };
  }

  // Fall back to file extension for cases the signature check can miss
  // (e.g. some HEIC files use non-standard brand codes).
  if (ext === "pdf") return { category: "pdf", format: "pdf", label: "PDF" };
  if (ext === "heic" || ext === "heif") return { category: "image", format: "heic", label: "HEIC/HEIF" };
  if (ext === "jpg" || ext === "jpeg") return { category: "image", format: "jpeg", label: "JPG" };
  if (ext === "png") return { category: "image", format: "png", label: "PNG" };
  if (ext === "webp") return { category: "image", format: "webp", label: "WebP" };
  if (ext === "gif") return { category: "image", format: "gif", label: "GIF" };
  if (ext === "bmp") return { category: "image", format: "bmp", label: "BMP" };
  if (ext === "avif") return { category: "image", format: "avif", label: "AVIF" };
  if (ext === "tif" || ext === "tiff") return { category: "image", format: "tiff", label: "TIFF" };
  if (ext === "mp4" || ext === "m4v") return { category: "video", format: "mp4", label: "MP4" };
  if (ext === "webm") return { category: "video", format: "webm", label: "WebM" };
  if (ext === "mov") return { category: "video", format: "mov", label: "MOV" };
  if (ext === "mkv") return { category: "video", format: "mkv", label: "MKV" };
  if (ext === "mp3") return { category: "audio", format: "mp3", label: "MP3" };
  if (ext === "wav") return { category: "audio", format: "wav", label: "WAV" };
  if (ext === "ogg") return { category: "audio", format: "ogg", label: "OGG" };

  return { category: "unknown", format: null, label: "this file" };
}

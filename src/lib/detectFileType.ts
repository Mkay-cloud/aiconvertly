import type { ImageFormatId } from "./imageFormats";

export type DetectedKind =
  | { category: "pdf"; format: "pdf"; label: string }
  | { category: "image"; format: ImageFormatId; label: string }
  | { category: "image"; format: "heic"; label: string }
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

  return { category: "unknown", format: null, label: "this file" };
}

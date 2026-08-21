import type { ImageFormatId } from "./imageFormats";

export function guessFormatFromFile(file: File): ImageFormatId {
  switch (file.type) {
    case "image/jpeg":
      return "jpeg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/bmp":
      return "bmp";
    case "image/avif":
      return "avif";
    case "image/tiff":
      return "tiff";
    default:
      return /\.(tif|tiff)$/i.test(file.name) ? "tiff" : "png";
  }
}

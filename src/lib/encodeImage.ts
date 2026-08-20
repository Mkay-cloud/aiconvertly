import type { ImageFormatId } from "./imageFormats";
import { canvasToBlob, getImageData } from "./canvasImage";
import { encodeBmp } from "./bmpEncode";
import { encodeGif } from "./gifEncode";
import { encodeTiff } from "./tiffCodec";
import { encodeAvif } from "./avifEncode";

export async function encodeImage(
  canvas: HTMLCanvasElement,
  format: ImageFormatId,
  quality: number
): Promise<Blob> {
  switch (format) {
    case "jpeg":
      return canvasToBlob(canvas, "image/jpeg", quality / 100);
    case "png":
      return canvasToBlob(canvas, "image/png");
    case "webp": {
      const blob = await canvasToBlob(canvas, "image/webp", quality / 100);
      if (blob.type !== "image/webp") {
        throw new Error("This browser can't export WebP images. Try Chrome, Firefox, or Edge.");
      }
      return blob;
    }
    case "gif":
      return encodeGif(getImageData(canvas));
    case "bmp":
      return encodeBmp(getImageData(canvas));
    case "avif":
      return encodeAvif(canvas, quality);
    case "tiff":
      return encodeTiff(getImageData(canvas));
    default:
      throw new Error("Unsupported output format");
  }
}

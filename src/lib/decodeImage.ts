import { drawToCanvas, imageDataToCanvas, loadBitmap } from "./canvasImage";
import { decodeTiff } from "./tiffCodec";

function isTiff(file: File): boolean {
  return (
    file.type === "image/tiff" ||
    /\.(tif|tiff)$/i.test(file.name)
  );
}

export async function decodeToCanvas(file: File): Promise<HTMLCanvasElement> {
  if (isTiff(file)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const imageData = await decodeTiff(bytes);
    return imageDataToCanvas(imageData);
  }
  const bitmap = await loadBitmap(file);
  return drawToCanvas(bitmap);
}

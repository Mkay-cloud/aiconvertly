import { canvasToBlob, getImageData } from "./canvasImage";

let avifEncodeReady: Promise<typeof import("@jsquash/avif/encode")> | null = null;

async function loadAvifEncoder() {
  if (!avifEncodeReady) {
    avifEncodeReady = (async () => {
      const avifEncode = await import("@jsquash/avif/encode");
      await avifEncode.init({ locateFile: (path: string) => `/wasm/${path}` });
      return avifEncode;
    })();
  }
  return avifEncodeReady;
}

export async function encodeAvif(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  try {
    const nativeBlob = await canvasToBlob(canvas, "image/avif", quality / 100);
    if (nativeBlob.type === "image/avif") return nativeBlob;
  } catch {
    // fall through to the WASM encoder
  }

  const avifEncode = await loadAvifEncoder();
  const imageData = getImageData(canvas);
  const buffer = await avifEncode.default(imageData, { quality });
  return new Blob([buffer], { type: "image/avif" });
}

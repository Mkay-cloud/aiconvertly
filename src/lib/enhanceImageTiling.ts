/**
 * Splits an image into overlapping tiles, runs each through the
 * super-resolution model, and stitches the results back together --
 * running the whole image through in one pass would allocate an
 * intermediate tensor many times the size of the image (a 32-layer, 64
 * channel feature map at full resolution) and reliably crashes the tab on
 * anything beyond a small photo.
 *
 * The algorithm (core tile + padded input crop, keep only the unpadded
 * core of each output tile when compositing) mirrors xinntao/Real-ESRGAN's
 * own `tile_process` (realesrgan/utils.py, BSD-3-Clause) exactly, since
 * it's the established, known-correct technique for this class of model.
 * TILE_PAD is sized to this specific model's receptive field: with 34
 * stacked 3x3 convolutions (1 input conv + 32 body convs + 1 output conv),
 * an output pixel at the edge of a tile's unpadded core depends on input
 * pixels up to 34px outside that core -- pad any less and the composited
 * result shows faint seams at tile boundaries. This was verified directly
 * (byte-identical to a non-tiled pass) rather than assumed; see the
 * conversion notes in public/models/enhance-image/README.md.
 */

export const UPSCALE = 4;
export const TILE_SIZE = 192;
export const TILE_PAD = 40;

export type TileRunner = (
  inputNCHW: Float32Array,
  width: number,
  height: number
) => Promise<Float32Array>;

export type EnhanceProgress = (tilesDone: number, tilesTotal: number) => void;

/** HWC RGBA Uint8 (from canvas ImageData) -> NCHW RGB float32 in [0, 1]. */
function imageDataToTensor(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData;
  const plane = width * height;
  const out = new Float32Array(3 * plane);
  for (let i = 0, p = 0; p < plane; p += 1, i += 4) {
    out[p] = data[i] / 255; // R
    out[plane + p] = data[i + 1] / 255; // G
    out[2 * plane + p] = data[i + 2] / 255; // B
  }
  return out;
}

/** NCHW RGB float32 in [0, 1] -> HWC RGBA Uint8ClampedArray (opaque). */
function tensorToImageData(tensor: Float32Array, width: number, height: number): ImageData {
  const plane = width * height;
  const data = new Uint8ClampedArray(4 * plane);
  for (let p = 0, i = 0; p < plane; p += 1, i += 4) {
    data[i] = tensor[p] * 255;
    data[i + 1] = tensor[plane + p] * 255;
    data[i + 2] = tensor[2 * plane + p] * 255;
    data[i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

function extractTensorRegion(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): Float32Array {
  return imageDataToTensor(ctx.getImageData(sx, sy, sw, sh));
}

/**
 * Runs `runTile` over the source canvas in overlapping tiles and returns a
 * new canvas at UPSCALE-x resolution. `onProgress` is called after every
 * tile so the UI can show real (not simulated) progress.
 *
 * `isCancelled` is checked before *starting* each tile, not during one --
 * a single tile's model inference runs on the main thread with no
 * mid-computation abort hook (onnxruntime-web's wasm/WebGPU execution
 * providers don't expose one when running outside a proxy worker, which
 * this tool intentionally doesn't use -- see onnxRuntime.ts for why).
 * That still genuinely stops the operation: no further tile computation
 * is ever started once cancelled, bounded by at most one already-in-
 * flight tile's short remaining runtime.
 */
export async function enhanceImageTiled(
  source: HTMLCanvasElement,
  runTile: TileRunner,
  onProgress?: EnhanceProgress,
  isCancelled?: () => boolean
): Promise<HTMLCanvasElement> {
  const { width, height } = source;
  const srcCtx = source.getContext("2d");
  if (!srcCtx) throw new Error("Canvas isn't supported in this browser");

  const outWidth = width * UPSCALE;
  const outHeight = height * UPSCALE;
  const dest = document.createElement("canvas");
  dest.width = outWidth;
  dest.height = outHeight;
  const destCtx = dest.getContext("2d");
  if (!destCtx) throw new Error("Canvas isn't supported in this browser");

  const tilesX = Math.ceil(width / TILE_SIZE);
  const tilesY = Math.ceil(height / TILE_SIZE);
  const tilesTotal = tilesX * tilesY;
  let tilesDone = 0;

  for (let ty = 0; ty < tilesY; ty += 1) {
    for (let tx = 0; tx < tilesX; tx += 1) {
      if (isCancelled?.()) throw new DOMException("Aborted", "AbortError");

      const inStartX = tx * TILE_SIZE;
      const inEndX = Math.min(inStartX + TILE_SIZE, width);
      const inStartY = ty * TILE_SIZE;
      const inEndY = Math.min(inStartY + TILE_SIZE, height);

      const inStartXPad = Math.max(inStartX - TILE_PAD, 0);
      const inEndXPad = Math.min(inEndX + TILE_PAD, width);
      const inStartYPad = Math.max(inStartY - TILE_PAD, 0);
      const inEndYPad = Math.min(inEndY + TILE_PAD, height);

      const tileWidth = inEndX - inStartX;
      const tileHeight = inEndY - inStartY;
      const padWidth = inEndXPad - inStartXPad;
      const padHeight = inEndYPad - inStartYPad;

      const tensor = extractTensorRegion(srcCtx, inStartXPad, inStartYPad, padWidth, padHeight);
      const outTensor = await runTile(tensor, padWidth, padHeight);
      const outTileImage = tensorToImageData(outTensor, padWidth * UPSCALE, padHeight * UPSCALE);

      // Keep only the unpadded core of this tile's output.
      const cropX = (inStartX - inStartXPad) * UPSCALE;
      const cropY = (inStartY - inStartYPad) * UPSCALE;
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = outTileImage.width;
      cropCanvas.height = outTileImage.height;
      const cropCtx = cropCanvas.getContext("2d")!;
      cropCtx.putImageData(outTileImage, 0, 0);

      destCtx.drawImage(
        cropCanvas,
        cropX,
        cropY,
        tileWidth * UPSCALE,
        tileHeight * UPSCALE,
        inStartX * UPSCALE,
        inStartY * UPSCALE,
        tileWidth * UPSCALE,
        tileHeight * UPSCALE
      );

      tilesDone += 1;
      onProgress?.(tilesDone, tilesTotal);
      // Yield to the browser between tiles so the progress update actually
      // paints and the tab doesn't appear frozen during a long enhancement.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return dest;
}

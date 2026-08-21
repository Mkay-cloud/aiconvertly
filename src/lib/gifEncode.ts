export async function encodeGif(imageData: ImageData): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const { width, height, data } = imageData;

  const palette = quantize(data, 256);
  const index = applyPalette(data, palette);

  const gif = GIFEncoder();
  gif.writeFrame(index, width, height, { palette });
  gif.finish();

  return new Blob([gif.bytes().slice()], { type: "image/gif" });
}

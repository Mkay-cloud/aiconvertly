async function loadUtif() {
  const mod = await import("utif2");
  return (mod as unknown as { default?: typeof mod }).default ?? mod;
}

export async function decodeTiff(bytes: Uint8Array): Promise<ImageData> {
  const UTIF = await loadUtif();
  const ifds = UTIF.decode(bytes.buffer as ArrayBuffer);
  if (ifds.length === 0) throw new Error("No image found in this TIFF file");
  const ifd = ifds[0];
  UTIF.decodeImage(bytes.buffer as ArrayBuffer, ifd);
  const rgba = UTIF.toRGBA8(ifd);
  return new ImageData(new Uint8ClampedArray(rgba), ifd.width, ifd.height);
}

export async function encodeTiff(imageData: ImageData): Promise<Blob> {
  const UTIF = await loadUtif();
  const buffer = UTIF.encodeImage(
    new Uint8Array(imageData.data.buffer),
    imageData.width,
    imageData.height
  );
  return new Blob([buffer], { type: "image/tiff" });
}

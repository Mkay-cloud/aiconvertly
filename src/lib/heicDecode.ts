export async function isHeicFile(file: File): Promise<boolean> {
  const { isHeic } = await import("heic-to");
  return isHeic(file);
}

export async function heicToJpeg(file: File, quality = 0.92): Promise<Blob> {
  const { heicTo } = await import("heic-to");
  return heicTo({ blob: file, type: "image/jpeg", quality });
}

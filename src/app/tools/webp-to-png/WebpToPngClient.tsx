"use client";

import { BatchImageConvertClient } from "@/components/BatchImageConvertClient";
import { canvasToBlob, drawToCanvas, loadBitmap } from "@/lib/canvasImage";
import { fileBaseName } from "@/lib/download";

async function convertToPng(file: File): Promise<Blob> {
  const bitmap = await loadBitmap(file);
  const canvas = drawToCanvas(bitmap);
  return canvasToBlob(canvas, "image/png");
}

export function WebpToPngClient() {
  return (
    <BatchImageConvertClient
      accept="image/webp,.webp"
      label="Drop WebP images here or click to browse"
      hint="Add one or more WebP images to convert them to PNG"
      convert={convertToPng}
      outputName={(file) => `${fileBaseName(file.name)}.png`}
      errorMessage="Couldn't convert this file — is it a valid WebP image?"
    />
  );
}

"use client";

import { useState } from "react";
import { BatchImageConvertClient } from "@/components/BatchImageConvertClient";
import { canvasToBlob, drawToCanvas, loadBitmap } from "@/lib/canvasImage";
import { fileBaseName } from "@/lib/download";

type Direction = "jpg-to-png" | "png-to-jpg";

async function convert(file: File, direction: Direction): Promise<Blob> {
  const bitmap = await loadBitmap(file);
  if (direction === "jpg-to-png") {
    const canvas = drawToCanvas(bitmap);
    return canvasToBlob(canvas, "image/png");
  }
  const canvas = drawToCanvas(bitmap, bitmap.width, bitmap.height, "#ffffff");
  return canvasToBlob(canvas, "image/jpeg", 0.92);
}

export function JpgPngConverterClient() {
  const [direction, setDirection] = useState<Direction>("jpg-to-png");

  const isJpgToPng = direction === "jpg-to-png";

  return (
    <BatchImageConvertClient
      key={direction}
      accept={isJpgToPng ? "image/jpeg,.jpg,.jpeg" : "image/png,.png"}
      label={
        isJpgToPng
          ? "Drop JPG images here or click to browse"
          : "Drop PNG images here or click to browse"
      }
      hint={
        isJpgToPng
          ? "Add one or more JPG images to convert them to PNG"
          : "Add one or more PNG images to convert them to JPG"
      }
      convert={(file) => convert(file, direction)}
      outputName={(file) =>
        `${fileBaseName(file.name)}.${isJpgToPng ? "png" : "jpg"}`
      }
      errorMessage="Couldn't convert this file."
      extraControls={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDirection("jpg-to-png")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isJpgToPng
                ? "bg-accent text-accent-foreground"
                : "border border-card-border text-secondary hover:text-foreground"
            }`}
          >
            JPG → PNG
          </button>
          <button
            type="button"
            onClick={() => setDirection("png-to-jpg")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              !isJpgToPng
                ? "bg-accent text-accent-foreground"
                : "border border-card-border text-secondary hover:text-foreground"
            }`}
          >
            PNG → JPG
          </button>
        </div>
      }
    />
  );
}

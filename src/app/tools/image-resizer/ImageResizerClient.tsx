"use client";

import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { formatBytes } from "@/lib/format";
import { downloadBlob, fileBaseName } from "@/lib/download";
import { decodeToCanvas } from "@/lib/decodeImage";
import { resizeCanvas } from "@/lib/canvasImage";
import { encodeImage } from "@/lib/encodeImage";
import { imageFormats, universalConverterAccept } from "@/lib/imageFormats";
import { guessFormatFromFile } from "@/lib/guessFormat";

type Mode = "pixels" | "percentage";

export function ImageResizerClient() {
  const [file, setFile] = useState<File | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [original, setOriginal] = useState<{ width: number; height: number } | null>(null);
  const [mode, setMode] = useState<Mode>("pixels");
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [percentage, setPercentage] = useState(50);
  const [lockAspect, setLockAspect] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: File[]) {
    const selected = files[0];
    if (!selected) return;
    setError(null);
    setFile(selected);
    setIsLoading(true);
    try {
      const decoded = await decodeToCanvas(selected);
      setCanvas(decoded);
      setOriginal({ width: decoded.width, height: decoded.height });
      setWidth(decoded.width);
      setHeight(decoded.height);
    } catch {
      setError("Couldn't read this image. It may be corrupted or in an unsupported format.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleWidthChange(value: number) {
    setWidth(value);
    if (lockAspect && original && original.width > 0) {
      setHeight(Math.round((value * original.height) / original.width));
    }
  }

  function handleHeightChange(value: number) {
    setHeight(value);
    if (lockAspect && original && original.height > 0) {
      setWidth(Math.round((value * original.width) / original.height));
    }
  }

  async function handleResize() {
    if (!canvas || !file || !original) return;
    const targetWidth =
      mode === "pixels" ? width : Math.round((original.width * percentage) / 100);
    const targetHeight =
      mode === "pixels" ? height : Math.round((original.height * percentage) / 100);

    if (targetWidth < 1 || targetHeight < 1) {
      setError("Enter a valid width and height.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const resized = resizeCanvas(canvas, targetWidth, targetHeight);
      const format = guessFormatFromFile(file);
      const blob = await encodeImage(resized, format, 92);
      downloadBlob(
        blob,
        `${fileBaseName(file.name)}-resized.${imageFormats[format].extension}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while resizing.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept={universalConverterAccept}
        onFiles={handleFiles}
        label="Drop an image here or click to browse"
        hint="Resize by exact pixels or by percentage"
      />

      {isLoading && (
        <div className="flex items-center gap-3 text-sm text-secondary">
          <Spinner className="h-4 w-4" /> Reading image…
        </div>
      )}

      {file && original && (
        <div className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-6">
          <p className="text-sm text-secondary">
            {file.name} · {original.width} × {original.height}px · {formatBytes(file.size)}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("pixels")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                mode === "pixels"
                  ? "bg-accent text-accent-foreground"
                  : "border border-card-border text-secondary hover:text-foreground"
              }`}
            >
              Pixels
            </button>
            <button
              type="button"
              onClick={() => setMode("percentage")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                mode === "percentage"
                  ? "bg-accent text-accent-foreground"
                  : "border border-card-border text-secondary hover:text-foreground"
              }`}
            >
              Percentage
            </button>
          </div>

          {mode === "pixels" ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end gap-4">
                <label className="flex flex-col gap-2 text-sm text-secondary">
                  Width (px)
                  <input
                    type="number"
                    min={1}
                    value={width}
                    onChange={(event) => handleWidthChange(Number(event.target.value))}
                    className="w-32 rounded-lg border border-card-border bg-bg px-4 py-2.5 text-foreground outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-secondary">
                  Height (px)
                  <input
                    type="number"
                    min={1}
                    value={height}
                    onChange={(event) => handleHeightChange(Number(event.target.value))}
                    className="w-32 rounded-lg border border-card-border bg-bg px-4 py-2.5 text-foreground outline-none focus:border-accent"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-secondary">
                <input
                  type="checkbox"
                  checked={lockAspect}
                  onChange={(event) => setLockAspect(event.target.checked)}
                  className="accent-accent"
                />
                Lock aspect ratio
              </label>
            </div>
          ) : (
            <label className="flex max-w-xs flex-col gap-2 text-sm text-secondary">
              Percentage of original size: {percentage}%
              <input
                type="range"
                min={1}
                max={200}
                value={percentage}
                onChange={(event) => setPercentage(Number(event.target.value))}
                className="accent-accent"
              />
              <span className="text-xs text-secondary">
                {Math.round((original.width * percentage) / 100)} ×{" "}
                {Math.round((original.height * percentage) / 100)}px
              </span>
            </label>
          )}

          <Button onClick={handleResize} disabled={isProcessing} className="self-start">
            {isProcessing && <Spinner className="h-4 w-4" />}
            {isProcessing ? "Resizing…" : "Resize & download"}
          </Button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

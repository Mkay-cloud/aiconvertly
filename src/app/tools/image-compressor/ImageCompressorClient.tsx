"use client";

import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { formatBytes } from "@/lib/format";
import { downloadBlob, fileBaseName } from "@/lib/download";
import { decodeToCanvas } from "@/lib/decodeImage";
import { encodeImage } from "@/lib/encodeImage";
import { imageFormats } from "@/lib/imageFormats";
import { compressToTargetSize, type TargetSizeProgress } from "@/lib/targetSizeCompress";
import { useHandoffFile } from "@/lib/useHandoffFile";

type Mode = "quality" | "targetSize";

type Result = {
  blob: Blob;
  name: string;
  // Only set by the Target Size flow -- the Quality flow's result is
  // always at the slider's own value and the original dimensions, so
  // there's nothing extra worth showing for it.
  targetSizeOutcome?: {
    quality: number;
    width: number;
    height: number;
    reachedTarget: boolean;
    wasResized: boolean;
    targetBytes: number;
  };
};

function flattenOnWhite(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0);
  return canvas;
}

export function ImageCompressorClient() {
  const [file, setFile] = useState<File | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<Mode>("quality");
  const [quality, setQuality] = useState(80);
  const [targetKB, setTargetKB] = useState(200);
  const [searchProgress, setSearchProgress] = useState<TargetSizeProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const outputFormat = file?.type === "image/webp" ? "webp" : "jpeg";

  useHandoffFile((file) => handleFiles([file]));

  async function handleFiles(files: File[]) {
    const selected = files[0];
    if (!selected) return;
    setError(null);
    setFile(selected);
    setResult(null);
    setIsLoading(true);
    try {
      const decoded = await decodeToCanvas(selected);
      setCanvas(decoded);
    } catch {
      setError("Couldn't read this image. It may be corrupted or in an unsupported format.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleModeChange(next: Mode) {
    setMode(next);
    setResult(null);
    setError(null);
  }

  async function handleCompress() {
    if (!canvas || !file) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);
    try {
      const source = outputFormat === "jpeg" ? flattenOnWhite(canvas) : canvas;
      const blob = await encodeImage(source, outputFormat, quality);
      setResult({
        blob,
        name: `${fileBaseName(file.name)}-compressed.${imageFormats[outputFormat].extension}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while compressing.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCompressToTarget() {
    if (!canvas || !file) return;
    if (!Number.isFinite(targetKB) || targetKB <= 0) {
      setError("Enter a target size greater than 0 KB.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setSearchProgress(null);
    try {
      const source = outputFormat === "jpeg" ? flattenOnWhite(canvas) : canvas;
      const targetBytes = Math.round(targetKB * 1024);
      const outcome = await compressToTargetSize(source, outputFormat, targetBytes, setSearchProgress);
      setResult({
        blob: outcome.blob,
        name: `${fileBaseName(file.name)}-compressed.${imageFormats[outputFormat].extension}`,
        targetSizeOutcome: {
          quality: outcome.quality,
          width: outcome.width,
          height: outcome.height,
          reachedTarget: outcome.reachedTarget,
          wasResized: outcome.wasResized,
          targetBytes,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while compressing.");
    } finally {
      setIsProcessing(false);
      setSearchProgress(null);
    }
  }

  const savedPercent =
    file && result ? Math.max(0, Math.round((1 - result.blob.size / file.size) * 100)) : null;

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onFiles={handleFiles}
        label="Drop a JPG, PNG, or WebP image here or click to browse"
        hint="Non-JPG/WebP images are converted to JPG for compression"
      />

      {isLoading && (
        <div className="flex items-center gap-3 text-sm text-secondary">
          <Spinner className="h-4 w-4" /> Reading image…
        </div>
      )}

      {file && canvas && (
        <div className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-6">
          <p className="text-sm text-secondary">
            {file.name} · {formatBytes(file.size)}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleModeChange("quality")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                mode === "quality"
                  ? "bg-accent text-accent-foreground"
                  : "border border-card-border text-secondary hover:text-foreground"
              }`}
            >
              Quality
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("targetSize")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                mode === "targetSize"
                  ? "bg-accent text-accent-foreground"
                  : "border border-card-border text-secondary hover:text-foreground"
              }`}
            >
              Target Size (KB)
            </button>
          </div>

          {mode === "quality" ? (
            <>
              <label className="flex max-w-xs flex-col gap-2 text-sm text-secondary">
                Quality: {quality}
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="accent-accent"
                />
              </label>

              <Button onClick={handleCompress} disabled={isProcessing} className="self-start">
                {isProcessing && <Spinner className="h-4 w-4" />}
                {isProcessing ? "Compressing…" : "Compress"}
              </Button>
            </>
          ) : (
            <>
              <label className="flex max-w-xs flex-col gap-2 text-sm text-secondary">
                Target size (KB)
                <input
                  type="number"
                  min={1}
                  value={targetKB}
                  onChange={(event) => setTargetKB(Number(event.target.value))}
                  className="w-32 rounded-lg border border-card-border bg-bg px-4 py-2.5 text-foreground outline-none focus:border-accent"
                />
                <span className="text-xs text-secondary">
                  Tries a quality level, checks the result, and adjusts up or down until it lands
                  close to this size. Very small targets may also need smaller pixel dimensions.
                </span>
              </label>

              <Button onClick={handleCompressToTarget} disabled={isProcessing} className="self-start">
                {isProcessing && <Spinner className="h-4 w-4" />}
                {isProcessing ? "Searching…" : "Compress to Target Size"}
              </Button>

              {isProcessing && searchProgress && (
                <div className="flex items-center gap-3 text-sm text-secondary">
                  <Spinner className="h-4 w-4" />
                  <span>
                    Trying quality {searchProgress.quality}
                    {searchProgress.phase === "resize" &&
                      ` at ${searchProgress.width}×${searchProgress.height}px`}{" "}
                    — currently {formatBytes(searchProgress.sizeBytes)} (attempt{" "}
                    {searchProgress.attempt} of up to {searchProgress.maxAttempts})
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      {result && file && (
        <div className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{result.name}</p>
              <p className="text-xs text-secondary">
                {formatBytes(file.size)} → {formatBytes(result.blob.size)}
                {savedPercent !== null && savedPercent > 0 && (
                  <span className="text-accent"> · {savedPercent}% smaller</span>
                )}
                {result.targetSizeOutcome && ` · quality ${result.targetSizeOutcome.quality}`}
                {result.targetSizeOutcome?.wasResized &&
                  ` · resized to ${result.targetSizeOutcome.width}×${result.targetSizeOutcome.height}px`}
              </p>
            </div>
            <Button onClick={() => downloadBlob(result.blob, result.name)}>Download</Button>
          </div>

          {result.targetSizeOutcome && !result.targetSizeOutcome.reachedTarget && (
            <p className="text-xs text-secondary">
              Couldn&apos;t get all the way down to {formatBytes(result.targetSizeOutcome.targetBytes)}{" "}
              — {formatBytes(result.blob.size)} is the closest this photo can get before it stops
              looking like a photo. Try a smaller image, or a less demanding target.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

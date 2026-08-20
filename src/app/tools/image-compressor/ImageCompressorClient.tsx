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

type Result = { blob: Blob; name: string };

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
  const [quality, setQuality] = useState(80);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const outputFormat = file?.type === "image/webp" ? "webp" : "jpeg";

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
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      {result && file && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-card-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{result.name}</p>
            <p className="text-xs text-secondary">
              {formatBytes(file.size)} → {formatBytes(result.blob.size)}
              {savedPercent !== null && savedPercent > 0 && (
                <span className="text-accent"> · {savedPercent}% smaller</span>
              )}
            </p>
          </div>
          <Button onClick={() => downloadBlob(result.blob, result.name)}>Download</Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { ProgressBar } from "@/components/ProgressBar";
import { formatBytes } from "@/lib/format";
import { downloadBlob, fileBaseName } from "@/lib/download";
import { decodeToCanvas } from "@/lib/decodeImage";
import { canvasToBlob } from "@/lib/canvasImage";
import { useHandoffFile } from "@/lib/useHandoffFile";
import { useEnhanceImageOperation } from "@/lib/useEnhanceImageOperation";
import { UPSCALE } from "@/lib/enhanceImageTiling";

// 4x upscale means output side length = input side length * 4. Capping the
// input side at 1500px keeps the output canvas (up to 6000x6000) well
// within every major browser's canvas size limits, and keeps a single
// enhancement to a bounded, reasonable amount of tiled WASM/WebGPU work.
const MAX_INPUT_DIMENSION = 1500;
// Below the hard cap, still warn: large photos mean many tiles, and this
// all runs on the visitor's own device.
const WARN_PIXEL_COUNT = 900 * 900;

type Result = { blob: Blob; name: string; width: number; height: number };

export function EnhanceImageClient() {
  const [file, setFile] = useState<File | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { run, cancel, phase, downloadPercent, enhancePercent, usedWebGPU, error, setError } =
    useEnhanceImageOperation();

  useHandoffFile((f) => handleFiles([f]));

  async function handleFiles(files: File[]) {
    const selected = files[0];
    if (!selected) return;
    setError(null);
    setResult(null);
    setFile(selected);
    setIsLoading(true);
    try {
      const decoded = await decodeToCanvas(selected);
      setCanvas(decoded);
    } catch {
      setError("Couldn't read this image. It may be corrupted or in an unsupported format.");
      setCanvas(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEnhance() {
    if (!canvas || !file) return;
    if (canvas.width > MAX_INPUT_DIMENSION || canvas.height > MAX_INPUT_DIMENSION) {
      setError(
        `This image is ${canvas.width} × ${canvas.height}px. Enhancing at 4x would produce an image larger than most browsers can handle — please use an image up to ${MAX_INPUT_DIMENSION}px on each side.`
      );
      return;
    }
    setResult(null);
    const enhanced = await run(canvas);
    if (!enhanced) return;
    const blob = await canvasToBlob(enhanced, "image/png");
    setResult({
      blob,
      name: `${fileBaseName(file.name)}-enhanced.png`,
      width: enhanced.width,
      height: enhanced.height,
    });
  }

  const isBusy = phase !== "idle";
  const isLargeImage = canvas ? canvas.width * canvas.height > WARN_PIXEL_COUNT : false;

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onFiles={handleFiles}
        label="Drop a photo here or click to browse"
        hint="Upscales and sharpens your image 4x using an on-device AI model"
      />

      {isLoading && (
        <div className="flex items-center gap-3 text-sm text-secondary">
          <Spinner className="h-4 w-4" /> Reading image…
        </div>
      )}

      {file && canvas && (
        <div className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-6">
          <p className="text-sm text-secondary">
            {file.name} · {canvas.width} × {canvas.height}px · {formatBytes(file.size)}
          </p>

          {isLargeImage && (
            <Alert>
              This is a {canvas.width} × {canvas.height}px image — everything runs on your
              device, so enhancing a photo this large to {canvas.width * UPSCALE} ×{" "}
              {canvas.height * UPSCALE}px can take a while and use a lot of memory. If you run
              into trouble, try a smaller image first.
            </Alert>
          )}

          <p className="text-xs text-secondary">
            Output: {canvas.width * UPSCALE} × {canvas.height * UPSCALE}px
          </p>

          {phase === "downloading" && (
            <ProgressBar label="Downloading AI model (one-time only)…" percent={downloadPercent} />
          )}
          {phase === "enhancing" && (
            <ProgressBar label="Enhancing your image…" percent={enhancePercent} />
          )}
          {isBusy && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={cancel}
              className="self-start"
            >
              Cancel
            </Button>
          )}

          <Button onClick={handleEnhance} disabled={isBusy} className="self-start">
            {isBusy && <Spinner className="h-4 w-4" />}
            {phase === "downloading" && "Downloading model…"}
            {phase === "enhancing" && "Enhancing…"}
            {phase === "idle" && "Enhance image"}
          </Button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      {result && file && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-card-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{result.name}</p>
            <p className="text-xs text-secondary">
              {canvas!.width} × {canvas!.height}px → {result.width} × {result.height}px ·{" "}
              {formatBytes(result.blob.size)}
              {usedWebGPU !== null && (
                <span> · Enhanced using {usedWebGPU ? "your GPU (WebGPU)" : "CPU (WebAssembly)"}</span>
              )}
            </p>
          </div>
          <Button onClick={() => downloadBlob(result.blob, result.name)}>Download</Button>
        </div>
      )}
    </div>
  );
}

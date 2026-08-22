"use client";

import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { ProgressBar } from "@/components/ProgressBar";
import { formatBytes } from "@/lib/format";
import { downloadBytes, fileBaseName } from "@/lib/download";
import { useHandoffFile } from "@/lib/useHandoffFile";
import { checkVideoCodecSupport, UnsupportedCodecError } from "@/lib/detectVideoCodec";
import { validateVideoUpfront, type VideoMetadata } from "@/lib/videoUpfrontLimits";
import { estimateEnhanceSeconds, formatSecondsRange } from "@/lib/enhanceVideoEstimate";
import { useEnhanceVideoOperation } from "@/lib/useEnhanceVideoOperation";

// No browser API reliably reports a paused video's frame rate before
// playback starts, so the pre-run estimate assumes the most common web
// frame rate and is labeled "approximately" -- the real count is confirmed
// moments later, once frame extraction actually runs.
const ASSUMED_FPS = 30;

type Result = { bytes: Uint8Array; name: string; extension: string; frameCount: number };

export function EnhanceVideoClient() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const {
    run,
    cancel,
    phase,
    preparingPercent,
    extractingPercent,
    modelPercent,
    frameIndex,
    frameTotal,
    frameTotalIsExact,
    reassemblingPercent,
    usedWebGPU,
    error,
    setError,
  } = useEnhanceVideoOperation();

  useHandoffFile((f) => handleFiles([f]));

  async function handleFiles(files: File[]) {
    const selected = files[0];
    if (!selected) return;
    setError(null);
    setResult(null);
    setMetadata(null);
    setFile(selected);
    setIsReading(true);
    try {
      const validation = await validateVideoUpfront(selected);
      if (!validation.ok) {
        setError(validation.reason);
        setFile(null);
        return;
      }
      setMetadata(validation.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read this video.");
      setFile(null);
    } finally {
      setIsReading(false);
    }
  }

  async function handleEnhance() {
    if (!file || !metadata) return;
    setResult(null);
    const codecCheck = await checkVideoCodecSupport(file);
    if (!codecCheck.supported) {
      setError(new UnsupportedCodecError(codecCheck.codecLabel).message);
      return;
    }
    const enhanced = await run(file);
    if (!enhanced) return;
    setResult({
      bytes: enhanced.bytes,
      name: `${fileBaseName(file.name)}-enhanced.${enhanced.extension}`,
      extension: enhanced.extension,
      frameCount: enhanced.frameCount,
    });
  }

  const isBusy = phase !== "idle";
  const estimatedFrameCount = metadata
    ? Math.max(1, Math.round(metadata.duration * ASSUMED_FPS))
    : 0;
  const estimate = metadata
    ? estimateEnhanceSeconds(estimatedFrameCount, metadata.width, metadata.height)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        onFiles={handleFiles}
        label="Drop a short video clip here or click to browse"
        hint="Clips up to 10 seconds and 50MB — every frame is enhanced by an AI model, so short clips only"
      />

      {isReading && (
        <div className="flex items-center gap-3 text-sm text-secondary">
          <Spinner className="h-4 w-4" /> Checking this video…
        </div>
      )}

      {file && metadata && (
        <div className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-6">
          <p className="text-sm text-secondary">
            {file.name} · {metadata.duration.toFixed(1)}s · {metadata.width} × {metadata.height}px ·{" "}
            {formatBytes(file.size)}
          </p>

          {!isBusy && !result && estimate && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-secondary">
              This will run approximately {estimatedFrameCount} frames through the AI model
              (assuming ~{ASSUMED_FPS}fps) — an estimated {formatSecondsRange(estimate.low, estimate.high)}{" "}
              depending on your device. The exact frame count is confirmed once you start. Your
              original audio is kept unchanged.
            </div>
          )}

          {phase === "preparing" && (
            <ProgressBar label="Loading converter…" percent={preparingPercent} />
          )}
          {phase === "extracting" && (
            <ProgressBar label="Extracting frames…" percent={extractingPercent} />
          )}
          {phase === "downloading-model" && (
            <ProgressBar label="Downloading AI model (one-time only)…" percent={modelPercent} />
          )}
          {phase === "enhancing" && (
            <ProgressBar
              label={`Enhancing frame ${frameIndex} of ${frameTotal}${frameTotalIsExact ? "" : " (estimated)"}`}
              percent={frameTotal > 0 ? Math.round((frameIndex / frameTotal) * 100) : 0}
            />
          )}
          {phase === "reassembling" && (
            <ProgressBar label="Reassembling video…" percent={reassemblingPercent} />
          )}
          {isBusy && (
            <Button type="button" variant="secondary" size="sm" onClick={cancel} className="self-start">
              Cancel
            </Button>
          )}

          <Button onClick={handleEnhance} disabled={isBusy} className="self-start">
            {isBusy && <Spinner className="h-4 w-4" />}
            {isBusy ? "Working…" : "Enhance video"}
          </Button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      {result && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-card-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{result.name}</p>
            <p className="text-xs text-secondary">
              {result.frameCount} frames enhanced 4x · {formatBytes(result.bytes.length)} · original
              audio preserved
              {usedWebGPU !== null && (
                <span> · Enhanced using {usedWebGPU ? "your GPU (WebGPU)" : "CPU (WebAssembly)"}</span>
              )}
            </p>
          </div>
          <Button
            onClick={() =>
              downloadBytes(
                result.bytes,
                result.name,
                result.extension === "webm" ? "video/webm" : "video/mp4"
              )
            }
          >
            Download
          </Button>
        </div>
      )}
    </div>
  );
}

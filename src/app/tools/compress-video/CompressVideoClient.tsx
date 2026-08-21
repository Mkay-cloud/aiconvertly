"use client";

import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { ConversionStatus } from "@/components/ConversionStatus";
import { LargeFileWarning } from "@/components/LargeFileWarning";
import { formatBytes } from "@/lib/format";
import { downloadBytes, fileBaseName } from "@/lib/download";
import { useFfmpegOperation } from "@/lib/useFfmpegOperation";
import { execFfmpeg, fastStartArgs, inputFileName, readAndValidateOutput, writeInputFile } from "@/lib/ffmpegIO";
import { checkVideoCodecSupport, UnsupportedCodecError } from "@/lib/detectVideoCodec";
import { useHandoffFile } from "@/lib/useHandoffFile";

type Result = { bytes: Uint8Array; name: string };

function qualityToCrf(quality: number): number {
  // quality 0-100 -> CRF 32 (smallest) - 18 (best quality)
  return Math.round(32 - (quality / 100) * (32 - 18));
}

export function CompressVideoClient() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(60);
  const [result, setResult] = useState<Result | null>(null);
  const {
    run,
    cancel,
    isLoadingCore,
    coreLoadProgress,
    isProcessing,
    processProgress,
    error,
    setError,
  } = useFfmpegOperation();

  function handleFiles(files: File[]) {
    const selected = files[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  }

  useHandoffFile((f) => handleFiles([f]));

  async function handleCompress() {
    if (!file) return;
    setResult(null);
    const codecCheck = await checkVideoCodecSupport(file);
    if (!codecCheck.supported) {
      setError(new UnsupportedCodecError(codecCheck.codecLabel).message);
      return;
    }
    await run(async (ffmpeg) => {
      const inputName = inputFileName(file, "mp4");
      await writeInputFile(ffmpeg, inputName, file);
      await execFfmpeg(ffmpeg, [
        "-i",
        inputName,
        "-c:v",
        "libx264",
        "-crf",
        String(qualityToCrf(quality)),
        "-preset",
        "fast",
        "-c:a",
        "aac",
        ...fastStartArgs("mp4"),
        "output.mp4",
      ]);
      const data = await readAndValidateOutput(ffmpeg, "output.mp4", "mp4");
      setResult({ bytes: data, name: `${fileBaseName(file.name)}-compressed.mp4` });
    });
  }

  const isBusy = isLoadingCore || isProcessing;
  const savedPercent =
    file && result ? Math.max(0, Math.round((1 - result.bytes.length / file.size) * 100)) : null;

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
        onFiles={handleFiles}
        label="Drop a video file here or click to browse"
        hint="Re-encodes to MP4 with an adjustable quality setting"
      />

      {file && (
        <div className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-6">
          <p className="text-sm text-secondary">
            {file.name} · {formatBytes(file.size)}
          </p>
          <LargeFileWarning file={file} />

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

          <ConversionStatus
            isLoadingCore={isLoadingCore}
            coreLoadProgress={coreLoadProgress}
            isProcessing={isProcessing}
            processProgress={processProgress}
            processingLabel="Compressing…"
            onCancel={cancel}
          />

          <Button onClick={handleCompress} disabled={isBusy} className="self-start">
            {isBusy && <Spinner className="h-4 w-4" />}
            {isBusy ? "Working…" : "Compress"}
          </Button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      {result && file && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-card-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{result.name}</p>
            <p className="text-xs text-secondary">
              {formatBytes(file.size)} → {formatBytes(result.bytes.length)}
              {savedPercent !== null && savedPercent > 0 && (
                <span className="text-accent"> · {savedPercent}% smaller</span>
              )}
            </p>
          </div>
          <Button onClick={() => downloadBytes(result.bytes, result.name, "video/mp4")}>
            Download
          </Button>
        </div>
      )}
    </div>
  );
}

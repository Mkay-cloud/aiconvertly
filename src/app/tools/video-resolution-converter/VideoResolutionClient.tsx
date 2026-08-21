"use client";

import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { ProgressBar } from "@/components/ProgressBar";
import { LargeFileWarning } from "@/components/LargeFileWarning";
import { formatBytes } from "@/lib/format";
import { downloadBytes, fileBaseName } from "@/lib/download";
import { useFfmpegOperation } from "@/lib/useFfmpegOperation";
import { execFfmpeg, fastStartArgs, inputFileName, readAndValidateOutput, writeInputFile } from "@/lib/ffmpegIO";
import { checkVideoCodecSupport, UnsupportedCodecError } from "@/lib/detectVideoCodec";
import { useHandoffFile } from "@/lib/useHandoffFile";

const resolutions = [
  { label: "480p", height: 480 },
  { label: "720p", height: 720 },
  { label: "1080p", height: 1080 },
];

export function VideoResolutionClient() {
  const [file, setFile] = useState<File | null>(null);
  const [height, setHeight] = useState(720);
  const {
    run,
    isLoadingCore,
    coreLoadProgress,
    isProcessing,
    processProgress,
    error,
    setError,
  } = useFfmpegOperation();

  function handleFiles(files: File[]) {
    const selected = files[0];
    if (selected) setFile(selected);
  }

  useHandoffFile((f) => handleFiles([f]));

  async function handleConvert() {
    if (!file) return;
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
        "-vf",
        `scale=-2:${height}`,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-c:a",
        "copy",
        ...fastStartArgs("mp4"),
        "output.mp4",
      ]);
      const data = await readAndValidateOutput(ffmpeg, "output.mp4", "mp4");
      downloadBytes(data, `${fileBaseName(file.name)}-${height}p.mp4`, "video/mp4");
    });
  }

  const isBusy = isLoadingCore || isProcessing;

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
        onFiles={handleFiles}
        label="Drop a video file here or click to browse"
        hint="Resize to a common resolution, keeping the aspect ratio"
      />

      {file && (
        <div className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-6">
          <p className="text-sm text-secondary">
            {file.name} · {formatBytes(file.size)}
          </p>
          <LargeFileWarning file={file} />

          <div className="flex flex-col gap-2">
            <span className="text-sm text-secondary">Resolution</span>
            <div className="flex flex-wrap gap-2">
              {resolutions.map((option) => (
                <button
                  key={option.height}
                  type="button"
                  onClick={() => setHeight(option.height)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    height === option.height
                      ? "bg-accent text-accent-foreground"
                      : "border border-card-border text-secondary hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isLoadingCore && (
            <ProgressBar label="Loading converter…" percent={coreLoadProgress} />
          )}
          {isProcessing && <ProgressBar label="Converting…" percent={processProgress} />}

          <Button onClick={handleConvert} disabled={isBusy} className="self-start">
            {isBusy && <Spinner className="h-4 w-4" />}
            {isBusy ? "Working…" : `Convert to ${height}p`}
          </Button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

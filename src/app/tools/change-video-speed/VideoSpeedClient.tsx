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
import { probeMedia } from "@/lib/ffmpegProbe";
import { useHandoffFile } from "@/lib/useHandoffFile";

export function VideoSpeedClient() {
  const [file, setFile] = useState<File | null>(null);
  const [speed, setSpeed] = useState(1);
  const {
    run,
    isLoadingCore,
    coreLoadProgress,
    isProcessing,
    processProgress,
    error,
  } = useFfmpegOperation();

  function handleFiles(files: File[]) {
    const selected = files[0];
    if (selected) setFile(selected);
  }

  useHandoffFile((f) => handleFiles([f]));

  async function handleConvert() {
    if (!file) return;
    await run(async (ffmpeg) => {
      const inputName = inputFileName(file, "mp4");
      await writeInputFile(ffmpeg, inputName, file);
      // Some real-world clips (screen recordings, muted exports) have no
      // audio track at all -- mapping "[0:a]" for those fails the whole
      // command, so only include the audio filter/map when audio exists.
      const { hasAudio } = await probeMedia(ffmpeg, inputName);
      const videoFilter = `[0:v]setpts=${(1 / speed).toFixed(4)}*PTS[v]`;
      const args = hasAudio
        ? [
            "-i",
            inputName,
            "-filter_complex",
            `${videoFilter};[0:a]atempo=${speed}[a]`,
            "-map",
            "[v]",
            "-map",
            "[a]",
            ...fastStartArgs("mp4"),
            "output.mp4",
          ]
        : [
            "-i",
            inputName,
            "-filter_complex",
            videoFilter,
            "-map",
            "[v]",
            ...fastStartArgs("mp4"),
            "output.mp4",
          ];
      await execFfmpeg(ffmpeg, args);
      const data = await readAndValidateOutput(ffmpeg, "output.mp4", "mp4");
      downloadBytes(data, `${fileBaseName(file.name)}-${speed}x.mp4`, "video/mp4");
    });
  }

  const isBusy = isLoadingCore || isProcessing;

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
        onFiles={handleFiles}
        label="Drop a video file here or click to browse"
        hint="Audio pitch is adjusted to match the new speed"
      />

      {file && (
        <div className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-6">
          <p className="text-sm text-secondary">
            {file.name} · {formatBytes(file.size)}
          </p>
          <LargeFileWarning file={file} />

          <label className="flex max-w-xs flex-col gap-2 text-sm text-secondary">
            Speed: {speed.toFixed(2)}x
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              className="accent-accent"
            />
          </label>

          {isLoadingCore && (
            <ProgressBar label="Loading converter…" percent={coreLoadProgress} />
          )}
          {isProcessing && <ProgressBar label="Processing…" percent={processProgress} />}

          <Button onClick={handleConvert} disabled={isBusy} className="self-start">
            {isBusy && <Spinner className="h-4 w-4" />}
            {isBusy ? "Working…" : "Change speed"}
          </Button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

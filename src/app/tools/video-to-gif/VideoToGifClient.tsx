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
import { execFfmpeg, inputFileName, readAndValidateOutput, writeInputFile } from "@/lib/ffmpegIO";
import { useHandoffFile } from "@/lib/useHandoffFile";

const widthOptions = [320, 480, 640];

export function VideoToGifClient() {
  const [file, setFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(3);
  const [width, setWidth] = useState(480);
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
      await execFfmpeg(ffmpeg, [
        "-ss",
        String(startTime),
        "-i",
        inputName,
        "-t",
        String(duration),
        "-vf",
        `fps=10,scale=${width}:-1:flags=lanczos`,
        "output.gif",
      ]);
      const data = await readAndValidateOutput(ffmpeg, "output.gif", "gif");
      downloadBytes(data, `${fileBaseName(file.name)}.gif`, "image/gif");
    });
  }

  const isBusy = isLoadingCore || isProcessing;

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
        onFiles={handleFiles}
        label="Drop a video file here or click to browse"
        hint="Pick a clip and we'll turn it into an animated GIF"
      />

      {file && (
        <div className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-6">
          <p className="text-sm text-secondary">
            {file.name} · {formatBytes(file.size)}
          </p>
          <LargeFileWarning file={file} />

          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-2 text-sm text-secondary">
              Start time (seconds)
              <input
                type="number"
                min={0}
                value={startTime}
                onChange={(event) => setStartTime(Math.max(0, Number(event.target.value)))}
                className="w-32 rounded-lg border border-card-border bg-bg px-4 py-2.5 text-foreground outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-secondary">
              Duration (seconds)
              <input
                type="number"
                min={1}
                max={15}
                value={duration}
                onChange={(event) =>
                  setDuration(Math.min(15, Math.max(1, Number(event.target.value))))
                }
                className="w-32 rounded-lg border border-card-border bg-bg px-4 py-2.5 text-foreground outline-none focus:border-accent"
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-secondary">Width</span>
            <div className="flex flex-wrap gap-2">
              {widthOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setWidth(option)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    width === option
                      ? "bg-accent text-accent-foreground"
                      : "border border-card-border text-secondary hover:text-foreground"
                  }`}
                >
                  {option}px
                </button>
              ))}
            </div>
          </div>

          {isLoadingCore && (
            <ProgressBar label="Loading converter…" percent={coreLoadProgress} />
          )}
          {isProcessing && <ProgressBar label="Creating GIF…" percent={processProgress} />}

          <Button onClick={handleConvert} disabled={isBusy} className="self-start">
            {isBusy && <Spinner className="h-4 w-4" />}
            {isBusy ? "Working…" : "Create GIF"}
          </Button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

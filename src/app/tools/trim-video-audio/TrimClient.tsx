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

export function TrimClient() {
  const [file, setFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
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
    if (selected) setFile(selected);
  }

  useHandoffFile((f) => handleFiles([f]));

  async function handleTrim() {
    if (!file) return;
    if (endTime <= startTime) {
      setError("End time must be after start time.");
      return;
    }
    const codecCheck = await checkVideoCodecSupport(file);
    if (!codecCheck.supported) {
      setError(new UnsupportedCodecError(codecCheck.codecLabel).message);
      return;
    }
    await run(async (ffmpeg) => {
      const inputName = inputFileName(file, "mp4");
      const ext = inputName.split(".").pop()!;
      const outputName = `output.${ext}`;
      await writeInputFile(ffmpeg, inputName, file);
      await execFfmpeg(ffmpeg, [
        "-ss",
        String(startTime),
        "-i",
        inputName,
        "-t",
        String(endTime - startTime),
        "-c",
        "copy",
        ...fastStartArgs(ext),
        outputName,
      ]);
      const data = await readAndValidateOutput(ffmpeg, outputName, ext);
      downloadBytes(data, `${fileBaseName(file.name)}-trimmed.${ext}`, file.type || "application/octet-stream");
    });
  }

  const isBusy = isLoadingCore || isProcessing;

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,audio/mpeg,audio/wav,audio/ogg,.mp4,.webm,.mov,.mkv,.mp3,.wav,.ogg"
        onFiles={handleFiles}
        label="Drop a video or audio file here or click to browse"
        hint="Choose the start and end time to keep"
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
                className="w-36 rounded-lg border border-card-border bg-bg px-4 py-2.5 text-foreground outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-secondary">
              End time (seconds)
              <input
                type="number"
                min={0}
                value={endTime}
                onChange={(event) => setEndTime(Math.max(0, Number(event.target.value)))}
                className="w-36 rounded-lg border border-card-border bg-bg px-4 py-2.5 text-foreground outline-none focus:border-accent"
              />
            </label>
          </div>

          <ConversionStatus
            isLoadingCore={isLoadingCore}
            coreLoadProgress={coreLoadProgress}
            isProcessing={isProcessing}
            processProgress={processProgress}
            processingLabel="Trimming…"
            onCancel={cancel}
          />

          <Button onClick={handleTrim} disabled={isBusy} className="self-start">
            {isBusy && <Spinner className="h-4 w-4" />}
            {isBusy ? "Working…" : "Trim & download"}
          </Button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

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

export function RemoveAudioClient() {
  const [file, setFile] = useState<File | null>(null);
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

  async function handleRemove() {
    if (!file) return;
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
      await execFfmpeg(ffmpeg, ["-i", inputName, "-c:v", "copy", "-an", ...fastStartArgs(ext), outputName]);
      const data = await readAndValidateOutput(ffmpeg, outputName, ext);
      downloadBytes(
        data,
        `${fileBaseName(file.name)}-muted.${ext}`,
        file.type || "application/octet-stream"
      );
    });
  }

  const isBusy = isLoadingCore || isProcessing;

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
        onFiles={handleFiles}
        label="Drop a video file here or click to browse"
        hint="We'll strip the audio track and keep the picture"
      />

      {file && (
        <div className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-6">
          <p className="text-sm text-secondary">
            {file.name} · {formatBytes(file.size)}
          </p>
          <LargeFileWarning file={file} />

          <ConversionStatus
            isLoadingCore={isLoadingCore}
            coreLoadProgress={coreLoadProgress}
            isProcessing={isProcessing}
            processProgress={processProgress}
            processingLabel="Removing audio…"
            onCancel={cancel}
          />

          <Button onClick={handleRemove} disabled={isBusy} className="self-start">
            {isBusy && <Spinner className="h-4 w-4" />}
            {isBusy ? "Working…" : "Remove audio"}
          </Button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

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
import { audioEncodeArgs, audioFormatList, audioFormats, type AudioFormatId } from "@/lib/mediaFormats";

export function AudioConverterClient() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<AudioFormatId>("mp3");
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
    const target = audioFormats[format];
    await run(async (ffmpeg) => {
      const inputName = inputFileName(file, "mp3");
      const outputName = `output.${target.extension}`;
      await writeInputFile(ffmpeg, inputName, file);
      await execFfmpeg(ffmpeg, [
        "-i",
        inputName,
        ...audioEncodeArgs(format),
        outputName,
      ]);
      const data = await readAndValidateOutput(ffmpeg, outputName, target.id);
      downloadBytes(data, `${fileBaseName(file.name)}.${target.extension}`, target.mime);
    });
  }

  const isBusy = isLoadingCore || isProcessing;

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="audio/mpeg,audio/wav,audio/ogg,audio/x-wav,.mp3,.wav,.ogg"
        onFiles={handleFiles}
        label="Drop an audio file here or click to browse"
        hint="Convert between MP3, WAV, and OGG"
      />

      {file && (
        <div className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-6">
          <p className="text-sm text-secondary">
            {file.name} · {formatBytes(file.size)}
          </p>
          <LargeFileWarning file={file} />

          <label className="flex max-w-xs flex-col gap-2 text-sm text-secondary">
            Convert to
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as AudioFormatId)}
              className="rounded-lg border border-card-border bg-bg px-4 py-2.5 text-foreground outline-none focus:border-accent"
            >
              {audioFormatList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          {isLoadingCore && (
            <ProgressBar label="Loading converter…" percent={coreLoadProgress} />
          )}
          {isProcessing && <ProgressBar label="Converting…" percent={processProgress} />}

          <Button onClick={handleConvert} disabled={isBusy} className="self-start">
            {isBusy && <Spinner className="h-4 w-4" />}
            {isBusy ? "Working…" : `Convert to ${audioFormats[format].label}`}
          </Button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

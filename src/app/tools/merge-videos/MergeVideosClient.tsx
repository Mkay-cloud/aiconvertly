"use client";

import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { FileRow } from "@/components/FileRow";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { ProgressBar } from "@/components/ProgressBar";
import { LargeFileWarning } from "@/components/LargeFileWarning";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/download";
import { useFfmpegOperation } from "@/lib/useFfmpegOperation";
import { readOutputFile, writeInputFile } from "@/lib/ffmpegIO";
import { useHandoffFile } from "@/lib/useHandoffFile";

type VideoItem = { id: string; file: File };

export function MergeVideosClient() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const {
    run,
    isLoadingCore,
    coreLoadProgress,
    isProcessing,
    processProgress,
    error,
  } = useFfmpegOperation();

  function addFiles(files: File[]) {
    setItems((prev) => [
      ...prev,
      ...files.map((file) => ({ id: crypto.randomUUID(), file })),
    ]);
  }

  useHandoffFile((file) => addFiles([file]));

  function moveItem(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleMerge() {
    if (items.length < 2) return;
    await run(async (ffmpeg) => {
      const names: string[] = [];
      for (let i = 0; i < items.length; i += 1) {
        const ext = items[i].file.name.split(".").pop() || "mp4";
        const name = `clip${i}.${ext}`;
        await writeInputFile(ffmpeg, name, items[i].file);
        names.push(name);
      }

      // Clips can arrive in different containers/codecs (mp4, webm, mov, mkv),
      // so a stream-copy concat demuxer can't reliably splice them -- it
      // requires matching codecs and silently produces an empty/invalid file
      // when they don't match. The concat filter decodes every clip and
      // re-encodes to one consistent H.264/AAC MP4 instead, which works
      // regardless of the source formats.
      const inputArgs = names.flatMap((name) => ["-i", name]);
      const filterInputs = names.map((_, i) => `[${i}:v:0][${i}:a:0]`).join("");
      const filterComplex = `${filterInputs}concat=n=${names.length}:v=1:a=1[v][a]`;

      await ffmpeg.exec([
        ...inputArgs,
        "-filter_complex",
        filterComplex,
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-c:a",
        "aac",
        "output.mp4",
      ]);
      const data = await readOutputFile(ffmpeg, "output.mp4");
      downloadBytes(data, "merged.mp4", "video/mp4");
    });
  }

  const isBusy = isLoadingCore || isProcessing;

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
        multiple
        onFiles={addFiles}
        label="Drop video files here or click to browse"
        hint="Add two or more clips to merge them, in the order you choose"
      />

      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <FileRow
              key={item.id}
              leading={<span className="text-xs font-semibold">MP4</span>}
              title={item.file.name}
              subtitle={formatBytes(item.file.size)}
              canMoveUp={index > 0}
              canMoveDown={index < items.length - 1}
              onMoveUp={() => moveItem(index, -1)}
              onMoveDown={() => moveItem(index, 1)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      )}

      {items.some((item) => item.file.size > 200 * 1024 * 1024) && (
        <LargeFileWarning
          file={items.reduce((a, b) => (a.file.size > b.file.size ? a : b)).file}
        />
      )}

      <p className="text-sm text-secondary">
        Works best when all clips use the same format and resolution.
      </p>

      {isLoadingCore && <ProgressBar label="Loading converter…" percent={coreLoadProgress} />}
      {isProcessing && <ProgressBar label="Merging…" percent={processProgress} />}

      <Button onClick={handleMerge} disabled={items.length < 2 || isBusy} className="self-start">
        {isBusy && <Spinner className="h-4 w-4" />}
        {isBusy ? "Working…" : "Merge videos"}
      </Button>

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

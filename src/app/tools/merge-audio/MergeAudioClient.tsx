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

type AudioItem = { id: string; file: File };

export function MergeAudioClient() {
  const [items, setItems] = useState<AudioItem[]>([]);
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
        const ext = items[i].file.name.split(".").pop() || "mp3";
        const name = `clip${i}.${ext}`;
        await writeInputFile(ffmpeg, name, items[i].file);
        names.push(name);
      }
      const listContent = names.map((name) => `file '${name}'`).join("\n");
      await ffmpeg.writeFile("list.txt", new TextEncoder().encode(listContent));
      await ffmpeg.exec([
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "list.txt",
        "-c:a",
        "libmp3lame",
        "-q:a",
        "2",
        "output.mp3",
      ]);
      const data = await readOutputFile(ffmpeg, "output.mp3");
      downloadBytes(data, "merged.mp3", "audio/mpeg");
    });
  }

  const isBusy = isLoadingCore || isProcessing;

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="audio/mpeg,audio/wav,audio/ogg,audio/x-wav,.mp3,.wav,.ogg"
        multiple
        onFiles={addFiles}
        label="Drop audio files here or click to browse"
        hint="Add two or more clips to merge them, in the order you choose"
      />

      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <FileRow
              key={item.id}
              leading={<span className="text-xs font-semibold">MP3</span>}
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
        Works best when all clips use the same format.
      </p>

      {isLoadingCore && <ProgressBar label="Loading converter…" percent={coreLoadProgress} />}
      {isProcessing && <ProgressBar label="Merging…" percent={processProgress} />}

      <Button onClick={handleMerge} disabled={items.length < 2 || isBusy} className="self-start">
        {isBusy && <Spinner className="h-4 w-4" />}
        {isBusy ? "Working…" : "Merge audio"}
      </Button>

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

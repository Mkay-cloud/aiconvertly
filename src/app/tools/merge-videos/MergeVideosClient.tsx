"use client";

import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { FileRow } from "@/components/FileRow";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { ConversionStatus } from "@/components/ConversionStatus";
import { LargeFileWarning } from "@/components/LargeFileWarning";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/download";
import { useFfmpegOperation } from "@/lib/useFfmpegOperation";
import { execFfmpeg, fastStartArgs, readAndValidateOutput, writeInputFile } from "@/lib/ffmpegIO";
import { probeMedia, type MediaProbe } from "@/lib/ffmpegProbe";
import { checkVideoCodecSupport, UnsupportedCodecError } from "@/lib/detectVideoCodec";
import { useHandoffFile } from "@/lib/useHandoffFile";

type VideoItem = { id: string; file: File };

export function MergeVideosClient() {
  const [items, setItems] = useState<VideoItem[]>([]);
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
    for (const item of items) {
      const codecCheck = await checkVideoCodecSupport(item.file);
      if (!codecCheck.supported) {
        setError(new UnsupportedCodecError(codecCheck.codecLabel, item.file.name).message);
        return;
      }
    }
    await run(async (ffmpeg) => {
      const names: string[] = [];
      for (let i = 0; i < items.length; i += 1) {
        const ext = items[i].file.name.split(".").pop() || "mp4";
        const name = `clip${i}.${ext}`;
        await writeInputFile(ffmpeg, name, items[i].file);
        names.push(name);
      }

      // Clips can arrive in different containers/codecs/resolutions/frame
      // rates (mp4, webm, mov, mkv; H.264, H.265, VP8/9; phone portrait vs.
      // landscape...), and real-world files often have no audio track at
      // all (screen recordings, muted exports). A stream-copy concat
      // demuxer can't splice any of that -- it requires every input to
      // already match, and silently produces an empty/truncated file when
      // they don't. So every clip is decoded, probed for an audio track,
      // and normalized (scaled/padded to a common canvas, resampled to a
      // common audio format, with silence synthesized for audio-less
      // clips) before concatenation -- this is what makes merging two real,
      // differently-encoded phone/screen-recording MP4s actually work
      // instead of producing a 0-byte file.
      const probes: MediaProbe[] = [];
      for (const name of names) {
        probes.push(await probeMedia(ffmpeg, name));
      }

      const inputArgs = names.flatMap((name) => ["-i", name]);
      const filterParts: string[] = [];
      const videoLabels: string[] = [];
      const audioLabels: string[] = [];
      let silentIndex = names.length;

      names.forEach((_, i) => {
        const vLabel = `v${i}`;
        filterParts.push(
          `[${i}:v:0]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30,format=yuv420p[${vLabel}]`
        );
        videoLabels.push(vLabel);

        const aLabel = `a${i}`;
        if (probes[i].hasAudio) {
          filterParts.push(
            `[${i}:a:0]aformat=sample_rates=44100:channel_layouts=stereo,asetpts=PTS-STARTPTS[${aLabel}]`
          );
        } else {
          inputArgs.push(
            "-f",
            "lavfi",
            "-t",
            String(Math.max(probes[i].duration, 0.1)),
            "-i",
            "anullsrc=r=44100:cl=stereo"
          );
          filterParts.push(`[${silentIndex}:a]asetpts=PTS-STARTPTS[${aLabel}]`);
          silentIndex += 1;
        }
        audioLabels.push(aLabel);
      });

      const concatInputs = videoLabels.map((v, i) => `[${v}][${audioLabels[i]}]`).join("");
      filterParts.push(`${concatInputs}concat=n=${names.length}:v=1:a=1[v][a]`);

      await execFfmpeg(ffmpeg, [
        ...inputArgs,
        "-filter_complex",
        filterParts.join(";"),
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
        ...fastStartArgs("mp4"),
        "output.mp4",
      ]);
      const data = await readAndValidateOutput(ffmpeg, "output.mp4", "mp4");
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
        Clips can be different formats, resolutions, or frame rates — they&rsquo;re
        automatically resized to match before merging.
      </p>

      <ConversionStatus
        isLoadingCore={isLoadingCore}
        coreLoadProgress={coreLoadProgress}
        isProcessing={isProcessing}
        processProgress={processProgress}
        processingLabel="Merging…"
        onCancel={cancel}
      />

      <Button onClick={handleMerge} disabled={items.length < 2 || isBusy} className="self-start">
        {isBusy && <Spinner className="h-4 w-4" />}
        {isBusy ? "Working…" : "Merge videos"}
      </Button>

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

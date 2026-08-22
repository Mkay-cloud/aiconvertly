"use client";

import { useCallback, useRef, useState } from "react";
import { loadFFmpeg, resetFFmpeg } from "./ffmpegClient";
import {
  FriendlyMediaError,
  execFfmpeg,
  fastStartArgs,
  inputFileName,
  readAndValidateOutput,
  writeInputFile,
} from "./ffmpegIO";
import { probeMedia } from "./ffmpegProbe";
import { videoCodecOnlyArgs } from "./mediaFormats";
import { loadEnhanceSession, resetEnhanceSession, runTileTensor } from "./onnxRuntime";
import { enhanceImageTiled } from "./enhanceImageTiling";
import { drawToCanvas, canvasToBlob } from "./canvasImage";

export type VideoEnhancePhase =
  | "idle"
  | "preparing"
  | "extracting"
  | "downloading-model"
  | "enhancing"
  | "reassembling";

export type VideoEnhanceResult = {
  bytes: Uint8Array;
  extension: string;
  frameCount: number;
  usedWebGPU: boolean;
};

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

const FRAME_PATTERN = "frame%04d.png";
const ENHANCED_PATTERN = "enh%04d.png";
const FRAME_NAME_RE = /^frame\d{4}\.png$/;

function frameFileName(index: number): string {
  return `frame${String(index).padStart(4, "0")}.png`;
}
function enhancedFileName(index: number): string {
  return `enh${String(index).padStart(4, "0")}.png`;
}

export function useEnhanceVideoOperation() {
  const [phase, setPhase] = useState<VideoEnhancePhase>("idle");
  const [preparingPercent, setPreparingPercent] = useState(0);
  const [extractingPercent, setExtractingPercent] = useState(0);
  const [modelPercent, setModelPercent] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [frameTotal, setFrameTotal] = useState(0);
  const [frameTotalIsExact, setFrameTotalIsExact] = useState(false);
  const [reassemblingPercent, setReassemblingPercent] = useState(0);
  const [usedWebGPU, setUsedWebGPU] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A per-invocation generation token, not a shared boolean: run() has no
  // cancellation checkpoint between every single await (e.g. right after
  // loadFFmpeg() settles), so a cancelled call can still be executing in
  // the background when the visitor immediately starts a fresh one. With a
  // single shared "cancelled" boolean, the fresh call resetting it to false
  // would make the *old*, still-running call's catch handler think it
  // wasn't cancelled and surface a real error for what was actually a
  // deliberate stop. Each run() takes the next generation for itself, which
  // also invalidates whichever call was previously in flight -- so an old
  // call's `isCancelled()` reads true the moment a newer one starts, no
  // matter which of them (an explicit cancel(), or just a fresh run())
  // caused it.
  const generationRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async (file: File): Promise<VideoEnhanceResult | null> => {
    const myGeneration = (generationRef.current += 1);
    const isCancelled = () => generationRef.current !== myGeneration;

    setError(null);
    setPreparingPercent(0);
    setExtractingPercent(0);
    setModelPercent(0);
    setFrameIndex(0);
    setFrameTotal(0);
    setFrameTotalIsExact(false);
    setReassemblingPercent(0);
    setUsedWebGPU(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setPhase("preparing");
      const ffmpeg = await loadFFmpeg((percent) => setPreparingPercent(percent));
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");

      const inputName = inputFileName(file, "mp4");
      const inputExt = inputName.split(".").pop()!;
      // Keep the output in the same container family as the input so a
      // stream-copied (never re-encoded) original audio track is always
      // muxing into a container that already natively supports its codec.
      const containerExt: "mp4" | "webm" = inputExt === "webm" || inputExt === "mkv" ? "webm" : "mp4";

      await writeInputFile(ffmpeg, inputName, file);
      const probe = await probeMedia(ffmpeg, inputName);
      if (probe.duration <= 0) {
        throw new FriendlyMediaError(
          "Couldn't read this video's duration. It may be corrupted or use an unsupported format."
        );
      }
      // Only used for the pre-extraction preview shown to the visitor --
      // the real frame count (and the frame rate actually used to
      // reassemble the video, for correct audio sync) come from what
      // extraction actually produces, below.
      const previewFps = probe.fps > 0 ? probe.fps : 30;
      setFrameTotal(Math.max(1, Math.round(probe.duration * previewFps)));

      setPhase("extracting");
      const handleExtractProgress = ({ progress }: { progress: number }) =>
        setExtractingPercent(clampPercent(progress * 100));
      ffmpeg.on("progress", handleExtractProgress);
      try {
        // -vsync 0: keep every decoded frame as-is, un-retimed -- so a
        // variable-frame-rate source doesn't get frames silently
        // duplicated or dropped to force a constant rate.
        await execFfmpeg(ffmpeg, ["-i", inputName, "-vsync", "0", FRAME_PATTERN]);
      } finally {
        ffmpeg.off("progress", handleExtractProgress);
      }
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");

      const files = await ffmpeg.listDir("/");
      const frameCount = files.filter((f) => !f.isDir && FRAME_NAME_RE.test(f.name)).length;
      if (frameCount === 0) {
        throw new FriendlyMediaError(
          "Couldn't extract any frames from this video -- it may be corrupted or use an unsupported format."
        );
      }
      setFrameTotal(frameCount);
      setFrameTotalIsExact(true);
      // The frame rate that actually makes reassembled video length match
      // the original audio's length, regardless of whether probe.fps (a
      // best-effort text scrape of ffmpeg's own log) was parsed correctly.
      const reassemblyFps = frameCount / probe.duration;

      // Extract the original audio completely unchanged (stream copy, no
      // re-encoding) -- into a file of the *same* container family it
      // already validly existed in, so the codec is always compatible.
      let audioFileName: string | null = null;
      if (probe.hasAudio) {
        audioFileName = `audio.${containerExt}`;
        await execFfmpeg(ffmpeg, ["-i", inputName, "-vn", "-acodec", "copy", audioFileName]);
      }
      await ffmpeg.deleteFile(inputName); // free memory, not needed past this point

      setPhase("downloading-model");
      const { session, usedWebGPU: gpu, ort } = await loadEnhanceSession(
        (loaded, total) => setModelPercent(total > 0 ? clampPercent((loaded / total) * 100) : 0),
        controller.signal
      );
      setUsedWebGPU(gpu);
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");

      setPhase("enhancing");
      for (let i = 1; i <= frameCount; i += 1) {
        if (isCancelled()) throw new DOMException("Aborted", "AbortError");
        setFrameIndex(i);

        const rawName = frameFileName(i);
        const raw = (await ffmpeg.readFile(rawName)) as Uint8Array;
        // Delete the raw frame the moment it's read, not after the whole
        // loop -- with up to several hundred frames, keeping every raw
        // *and* every enhanced frame in ffmpeg's in-memory FS at once
        // would multiply peak memory use for no reason.
        await ffmpeg.deleteFile(rawName);

        const bitmap = await createImageBitmap(new Blob([new Uint8Array(raw)], { type: "image/png" }));
        const canvas = drawToCanvas(bitmap);
        bitmap.close();

        const enhancedCanvas = await enhanceImageTiled(
          canvas,
          (tensor, width, height) => runTileTensor(session, ort, tensor, width, height),
          undefined,
          isCancelled
        );
        const blob = await canvasToBlob(enhancedCanvas, "image/png");
        await ffmpeg.writeFile(enhancedFileName(i), new Uint8Array(await blob.arrayBuffer()));
      }

      setPhase("reassembling");
      const handleReassembleProgress = ({ progress }: { progress: number }) =>
        setReassemblingPercent(clampPercent(progress * 100));
      ffmpeg.on("progress", handleReassembleProgress);
      const outputName = `output.${containerExt}`;
      try {
        const args = [
          "-r",
          reassemblyFps.toFixed(3),
          "-start_number",
          "1",
          "-i",
          ENHANCED_PATTERN,
          ...(audioFileName ? ["-i", audioFileName, "-map", "0:v", "-map", "1:a"] : []),
          ...videoCodecOnlyArgs(containerExt),
          ...(audioFileName ? ["-c:a", "copy"] : []),
          "-pix_fmt",
          "yuv420p",
          ...(audioFileName ? ["-shortest"] : []),
          ...fastStartArgs(containerExt),
          outputName,
        ];
        await execFfmpeg(ffmpeg, args);
      } finally {
        ffmpeg.off("progress", handleReassembleProgress);
      }

      const data = await readAndValidateOutput(ffmpeg, outputName, containerExt);
      return { bytes: data, extension: containerExt, frameCount, usedWebGPU: gpu };
    } catch (err) {
      // cancel() already terminated ffmpeg and/or reset the ONNX session
      // and cleared busy state itself -- this rejection is just that
      // surfacing through whichever call was in flight. Not a real
      // failure, so it must not show an error message. isCancelled() also
      // reads true if a *fresh* run() started while this one was still
      // finishing up in the background (no explicit cancel() involved) --
      // same reasoning applies: whatever this call's error is, it's not
      // this (now-superseded) invocation's to report.
      if (isCancelled()) {
        return null;
      }
      if (err instanceof FriendlyMediaError) {
        setError(err.message);
      } else {
        // An unexpected failure could leave either the ffmpeg worker or
        // the ONNX session in a bad state (this is how the ffmpeg-side
        // hard WASM traps documented elsewhere in this codebase actually
        // manifest) -- reset both so the next attempt starts genuinely
        // fresh instead of silently reusing something broken.
        resetFFmpeg();
        resetEnhanceSession();
        setError("Video enhancement failed — try a shorter clip or a smaller file.");
      }
      return null;
    } finally {
      // Only this invocation's own cleanup -- if a newer generation has
      // since taken over (via cancel() or a fresh run()), it owns
      // abortControllerRef/phase now, and this stale call must not stomp on
      // them on its way out.
      if (!isCancelled()) {
        abortControllerRef.current = null;
        setPhase("idle");
      }
    }
  }, []);

  // Actually stops work, at whichever of the two fragile systems (ffmpeg,
  // the ONNX session) is currently active -- not just hides the progress
  // UI. Terminating ffmpeg genuinely kills its worker thread and its CPU
  // usage outright; the ONNX session has no such worker to kill (see
  // enhanceImageTiling.ts), so cancelling during the per-frame AI loop
  // guarantees no *further* tile or frame computation is ever started,
  // bounded by at most one already-in-flight tile's short remaining
  // runtime. Either way both systems are reset the same way a crash resets
  // them, so the tool is immediately usable again with no page refresh.
  const cancel = useCallback(() => {
    generationRef.current += 1;
    abortControllerRef.current?.abort();
    resetFFmpeg();
    resetEnhanceSession();
    setPhase("idle");
    setPreparingPercent(0);
    setExtractingPercent(0);
    setModelPercent(0);
    setFrameIndex(0);
    setReassemblingPercent(0);
    setError(null);
  }, []);

  return {
    run,
    cancel,
    phase,
    preparingPercent,
    extractingPercent,
    modelPercent,
    frameIndex,
    frameTotal,
    frameTotalIsExact,
    reassemblingPercent,
    usedWebGPU,
    error,
    setError,
  };
}

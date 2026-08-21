"use client";

import { useCallback, useRef, useState } from "react";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { loadFFmpeg, resetFFmpeg } from "./ffmpegClient";
import { FriendlyMediaError } from "./ffmpegIO";

type ProgressEvent = { progress: number };

export function useFfmpegOperation() {
  const [isLoadingCore, setIsLoadingCore] = useState(false);
  const [coreLoadProgress, setCoreLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const run = useCallback(async (fn: (ffmpeg: FFmpeg) => Promise<void>) => {
    setError(null);
    try {
      if (!ffmpegRef.current?.loaded) {
        setIsLoadingCore(true);
        setCoreLoadProgress(0);
        const ffmpeg = await loadFFmpeg((percent) => setCoreLoadProgress(percent));
        ffmpegRef.current = ffmpeg;
        setIsLoadingCore(false);
      }

      const ffmpeg = ffmpegRef.current;
      setIsProcessing(true);
      setProcessProgress(0);

      const handleProgress = ({ progress }: ProgressEvent) => {
        setProcessProgress(Math.min(100, Math.max(0, Math.round(progress * 100))));
      };
      ffmpeg.on("progress", handleProgress);
      try {
        await fn(ffmpeg);
      } finally {
        ffmpeg.off("progress", handleProgress);
      }
    } catch (err) {
      // Only errors we've deliberately written with a user-safe message
      // (FriendlyMediaError) are ever shown verbatim. Everything else --
      // raw ffmpeg/WASM failures, hard WASM traps like "RuntimeError:
      // memory access out of bounds", arbitrary browser errors -- collapses
      // to one generic message. Raw technical text must never reach the
      // screen.
      if (err instanceof FriendlyMediaError) {
        setError(err.message);
      } else {
        // An unexpected (non-friendly) failure may mean the underlying wasm
        // instance itself is now corrupted (this is how the hard traps
        // above actually manifest) -- reset it so the next attempt gets a
        // fresh instance instead of silently reusing a broken one.
        resetFFmpeg();
        ffmpegRef.current = null;
        setError("This conversion failed — try different files or a smaller file size.");
      }
    } finally {
      setIsLoadingCore(false);
      setIsProcessing(false);
    }
  }, []);

  return {
    run,
    isLoadingCore,
    coreLoadProgress,
    isProcessing,
    processProgress,
    error,
    setError,
  };
}

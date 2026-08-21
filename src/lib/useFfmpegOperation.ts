"use client";

import { useCallback, useRef, useState } from "react";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { loadFFmpeg } from "./ffmpegClient";

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
      const message =
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Something went wrong during processing.";
      setError(message || "Something went wrong during processing.");
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

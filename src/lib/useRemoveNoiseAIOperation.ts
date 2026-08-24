import { useCallback, useRef, useState } from "react";
import { loadGtcrnSession, resetGtcrnSession, runGtcrn } from "./gtcrnRuntime";
import { gtcrnStft, gtcrnIstft, GTCRN_SAMPLE_RATE } from "./gtcrnStft";
import { decodeTo16kMono } from "./decodeAudioPcm";
import { encodeWavMono16 } from "./wavEncode";

export type RemoveNoisePhase = "idle" | "decoding" | "downloading-model" | "enhancing";

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export type RemoveNoiseAIResult = { bytes: Uint8Array; sampleRate: number; usedWebGPU: boolean };

export function useRemoveNoiseAIOperation() {
  const [phase, setPhase] = useState<RemoveNoisePhase>("idle");
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [usedWebGPU, setUsedWebGPU] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Same reasoning as useEnhanceImageOperation.ts's cancelRequestedRef: lets
  // the catch handler below tell a deliberate cancel() apart from a real
  // failure, since both surface as the same rejected/aborted promise.
  const cancelRequestedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async (file: File): Promise<RemoveNoiseAIResult | null> => {
    setError(null);
    setDownloadPercent(0);
    setUsedWebGPU(null);
    cancelRequestedRef.current = false;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setPhase("decoding");
      const samples = await decodeTo16kMono(file);
      if (cancelRequestedRef.current) throw new DOMException("Aborted", "AbortError");

      setPhase("downloading-model");
      const { session, usedWebGPU: gpu, ort } = await loadGtcrnSession((loaded, total) => {
        setDownloadPercent(total > 0 ? clampPercent((loaded / total) * 100) : 0);
      }, controller.signal);
      setUsedWebGPU(gpu);
      if (cancelRequestedRef.current) throw new DOMException("Aborted", "AbortError");

      setPhase("enhancing");
      const spec = gtcrnStft(samples);
      const enhancedSpec = await runGtcrn(session, ort, spec);
      if (cancelRequestedRef.current) throw new DOMException("Aborted", "AbortError");
      const enhanced = gtcrnIstft(enhancedSpec.real, enhancedSpec.imag, samples.length);

      const bytes = encodeWavMono16(enhanced, GTCRN_SAMPLE_RATE);
      return { bytes, sampleRate: GTCRN_SAMPLE_RATE, usedWebGPU: gpu };
    } catch {
      // cancel() already aborted the in-flight download (or the check
      // above caught it right after) and reset the session -- this
      // rejection is just that surfacing through the awaited call, not a
      // real failure.
      if (cancelRequestedRef.current) {
        return null;
      }
      // A decode failure (unsupported/corrupt file) throws a real
      // DOMException/Error with browser-provided text that isn't
      // necessarily safe to show verbatim -- collapse anything
      // unexpected (including a possibly-corrupted ONNX session) to one
      // generic, user-safe message and reset the session for next time.
      resetGtcrnSession();
      setError("Couldn't process this audio file. It may be corrupted or use an unsupported format.");
      return null;
    } finally {
      abortControllerRef.current = null;
      setPhase("idle");
    }
  }, []);

  // Actually stops work: aborts an in-flight model download outright, and
  // for the STFT/inference/ISTFT steps guarantees the result is discarded
  // once the checkpoints above see the cancellation -- the ONNX session is
  // released and reset the same way a crash resets it either way, so the
  // tool is immediately ready again with no page refresh.
  const cancel = useCallback(() => {
    cancelRequestedRef.current = true;
    abortControllerRef.current?.abort();
    resetGtcrnSession();
    setPhase("idle");
    setDownloadPercent(0);
    setError(null);
  }, []);

  return {
    run,
    cancel,
    phase,
    downloadPercent,
    usedWebGPU,
    error,
    setError,
  };
}

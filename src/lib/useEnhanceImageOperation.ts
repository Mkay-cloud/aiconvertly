import { useCallback, useRef, useState } from "react";
import { loadEnhanceSession, resetEnhanceSession, runTileTensor } from "./onnxRuntime";
import { enhanceImageTiled } from "./enhanceImageTiling";

export type EnhancePhase = "idle" | "downloading" | "enhancing";

// Defense in depth: keeps a displayed percentage sane even if a future
// progress source ever reports an out-of-range ratio, the way an
// unavailable Content-Length once did (see onnxRuntime.ts).
function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function useEnhanceImageOperation() {
  const [phase, setPhase] = useState<EnhancePhase>("idle");
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [enhancePercent, setEnhancePercent] = useState(0);
  const [usedWebGPU, setUsedWebGPU] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set by cancel() so run()'s catch handler -- which sees the same
  // abort/rejection as any other failure -- knows to stay silent instead
  // of surfacing an error for what was actually a deliberate stop. Mirrors
  // the same pattern in useFfmpegOperation.ts.
  const cancelRequestedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async (source: HTMLCanvasElement): Promise<HTMLCanvasElement | null> => {
    setError(null);
    setDownloadPercent(0);
    setEnhancePercent(0);
    cancelRequestedRef.current = false;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      setPhase("downloading");
      const { session, usedWebGPU: gpu, ort } = await loadEnhanceSession((loaded, total) => {
        setDownloadPercent(total > 0 ? clampPercent((loaded / total) * 100) : 0);
      }, controller.signal);
      setUsedWebGPU(gpu);

      setPhase("enhancing");
      const result = await enhanceImageTiled(
        source,
        (tensor, width, height) => runTileTensor(session, ort, tensor, width, height),
        (done, total) => setEnhancePercent(clampPercent((done / total) * 100)),
        () => cancelRequestedRef.current
      );
      return result;
    } catch (err) {
      // cancel() already aborted the download (or stopped tiling before
      // its next tile) and reset the session itself -- the rejection
      // we're seeing here is just that surfacing through the awaited
      // call. It's not a real failure, so it must not show an error.
      if (cancelRequestedRef.current) {
        return null;
      }
      // A corrupted or unexpectedly-shaped session/tensor failure could
      // leave the underlying wasm/WebGPU session in a bad state -- reset
      // it so the next attempt gets a fresh session instead of reusing a
      // possibly-broken one.
      resetEnhanceSession();
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Enhancement failed — try a different image or a smaller one."
      );
      return null;
    } finally {
      abortControllerRef.current = null;
      setPhase("idle");
    }
  }, []);

  // Actually stops work -- not just hides the progress UI. Aborts an
  // in-progress model/runtime download outright (the browser genuinely
  // cancels the network transfer), and for tile processing, guarantees no
  // further tile computation is ever started; either way the ONNX session
  // is released and reset the same way a crash/timeout resets it, so the
  // tool is immediately ready for a fresh attempt with no page refresh.
  const cancel = useCallback(() => {
    cancelRequestedRef.current = true;
    abortControllerRef.current?.abort();
    resetEnhanceSession();
    setPhase("idle");
    setDownloadPercent(0);
    setEnhancePercent(0);
    setError(null);
  }, []);

  return {
    run,
    cancel,
    phase,
    downloadPercent,
    enhancePercent,
    usedWebGPU,
    error,
    setError,
  };
}

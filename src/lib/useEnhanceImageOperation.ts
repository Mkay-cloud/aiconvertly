import { useCallback, useState } from "react";
import { loadEnhanceSession, resetEnhanceSession, runTileTensor } from "./onnxRuntime";
import { enhanceImageTiled } from "./enhanceImageTiling";

export type EnhancePhase = "idle" | "downloading" | "enhancing";

export function useEnhanceImageOperation() {
  const [phase, setPhase] = useState<EnhancePhase>("idle");
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [enhancePercent, setEnhancePercent] = useState(0);
  const [usedWebGPU, setUsedWebGPU] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (source: HTMLCanvasElement): Promise<HTMLCanvasElement | null> => {
    setError(null);
    setDownloadPercent(0);
    setEnhancePercent(0);
    try {
      setPhase("downloading");
      const { session, usedWebGPU: gpu, ort } = await loadEnhanceSession((loaded, total) => {
        setDownloadPercent(total > 0 ? Math.round((loaded / total) * 100) : 0);
      });
      setUsedWebGPU(gpu);

      setPhase("enhancing");
      const result = await enhanceImageTiled(
        source,
        (tensor, width, height) => runTileTensor(session, ort, tensor, width, height),
        (done, total) => setEnhancePercent(Math.round((done / total) * 100))
      );
      return result;
    } catch (err) {
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
      setPhase("idle");
    }
  }, []);

  return {
    run,
    phase,
    downloadPercent,
    enhancePercent,
    usedWebGPU,
    error,
    setError,
  };
}

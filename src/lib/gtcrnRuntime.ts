import type { InferenceSession as InferenceSessionType, Tensor as TensorType } from "onnxruntime-web";
import { cachedFetchArrayBuffer } from "./modelCache";
import { GTCRN_FREQ_BINS, type Spectrogram } from "./gtcrnStft";

const MODEL_URL = "/models/remove-noise/gtcrn.onnx";
const MODEL_SIZE_BYTES = 420_698;
const ORT_DIR = "/ort";

// Same reasoning as onnxRuntime.ts (used by Enhance Image/Video Quality):
// the JSEP binary adds the WebGPU execution provider on top of the same
// wasm-CPU kernels, at roughly 2x the download, so it's only worth
// fetching when a real WebGPU adapter is available. GTCRN is tiny (48.2K
// params) compared to the image model, but the runtime binary itself is
// the same either way.
function ortAssetNames(useWebGPU: boolean) {
  return useWebGPU
    ? { mjs: "ort-wasm-simd-threaded.jsep.mjs", wasm: "ort-wasm-simd-threaded.jsep.wasm", wasmSize: 26_827_543 }
    : { mjs: "ort-wasm-simd-threaded.mjs", wasm: "ort-wasm-simd-threaded.wasm", wasmSize: 13_479_978 };
}

/** Same real-adapter feature test as onnxRuntime.ts -- see there for why `"gpu" in navigator` alone isn't reliable. */
async function hasWorkingWebGPUAdapter(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter != null;
  } catch {
    return false;
  }
}

export type DownloadProgress = (loadedBytes: number, totalBytes: number) => void;

async function loadOrtModule() {
  // Self-hosted, unbundled ESM entry loaded via a fully-qualified URL, same
  // technique (and same reason -- webpack can't statically bundle this
  // module's own internal wasm loading) as onnxRuntime.ts and the ffmpeg
  // worker in ffmpegClient.ts.
  const url = `${window.location.origin}${ORT_DIR}/ort.webgpu.min.mjs`;
  return import(/* webpackIgnore: true */ url) as Promise<typeof import("onnxruntime-web")>;
}

type OrtModule = typeof import("onnxruntime-web");
type LoadedSession = { session: InferenceSessionType; usedWebGPU: boolean; ort: OrtModule };

let sessionPromise: Promise<LoadedSession> | null = null;

/**
 * Downloads (or reuses the cached copy of) the ORT wasm runtime and the
 * GTCRN model weights, then creates an inference session. WebGPU is
 * attempted first when the browser supports it, falling back to wasm on
 * any session-creation failure -- identical strategy to
 * onnxRuntime.ts's loadEnhanceSession, kept as a separate module because
 * this is a different model with a different input/output tensor
 * contract (spec/spec_enh vs. input/output), not because the loading
 * pattern itself differs.
 */
export async function loadGtcrnSession(
  onProgress?: DownloadProgress,
  signal?: AbortSignal
): Promise<LoadedSession> {
  if (sessionPromise) return sessionPromise;

  // Same stale-attempt guard as loadEnhanceSession/loadFFmpeg: resetGtcrnSession()
  // (called by Cancel) can null out sessionPromise and let a fresh attempt
  // start while this attempt's own rejection is still in flight.
  const attempt: Promise<LoadedSession> = (async () => {
    const ort = await loadOrtModule();
    const wantWebGPU = await hasWorkingWebGPUAdapter();
    const assets = ortAssetNames(wantWebGPU);

    let wasmTotal = 0;
    let modelTotal = 0;
    let wasmLoaded = 0;
    let modelLoaded = 0;
    const report = () => {
      const combinedTotal = wasmTotal + modelTotal;
      if (combinedTotal > 0) onProgress?.(wasmLoaded + modelLoaded, combinedTotal);
    };

    // allSettled (not all) so a rejection on one download doesn't leave the
    // other unobserved -- same unhandled-rejection fix as loadEnhanceSession.
    const [wasmResult, modelResult] = await Promise.allSettled([
      cachedFetchArrayBuffer(
        `${ORT_DIR}/${assets.wasm}`,
        (loaded, total) => {
          wasmLoaded = loaded;
          wasmTotal = total;
          report();
        },
        signal,
        assets.wasmSize
      ),
      cachedFetchArrayBuffer(
        MODEL_URL,
        (loaded, total) => {
          modelLoaded = loaded;
          modelTotal = total;
          report();
        },
        signal,
        MODEL_SIZE_BYTES
      ),
    ]);
    if (wasmResult.status === "rejected") throw wasmResult.reason;
    if (modelResult.status === "rejected") throw modelResult.reason;
    const wasmBinary = wasmResult.value;
    const modelBuffer = modelResult.value;

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    ort.env.wasm.numThreads = 1; // no SharedArrayBuffer/COOP+COEP needed
    ort.env.wasm.wasmPaths = { mjs: `${ORT_DIR}/${assets.mjs}` };
    ort.env.wasm.wasmBinary = wasmBinary;

    async function createSession(providers: InferenceSessionType.ExecutionProviderConfig[]) {
      return ort.InferenceSession.create(modelBuffer, {
        executionProviders: providers,
        graphOptimizationLevel: "all",
      });
    }

    if (wantWebGPU) {
      try {
        return { session: await createSession(["webgpu", "wasm"]), usedWebGPU: true, ort };
      } catch {
        const plain = ortAssetNames(false);
        ort.env.wasm.wasmPaths = { mjs: `${ORT_DIR}/${plain.mjs}` };
        ort.env.wasm.wasmBinary = await cachedFetchArrayBuffer(
          `${ORT_DIR}/${plain.wasm}`,
          undefined,
          signal,
          plain.wasmSize
        );
      }
    }
    return { session: await createSession(["wasm"]), usedWebGPU: false, ort };
  })().catch((err) => {
    if (sessionPromise === attempt) sessionPromise = null;
    throw err;
  });
  sessionPromise = attempt;

  return sessionPromise;
}

export function resetGtcrnSession(): void {
  // Same "don't leave an unhandled rejection when cancel() lands mid-load" fix as resetEnhanceSession.
  sessionPromise
    ?.then(({ session }) => session.release())
    .catch(() => {});
  sessionPromise = null;
}

/**
 * Runs one full-clip GTCRN inference: spec in (F=257, T frames, real/imag),
 * spec_enh out, same shape. GTCRN is small enough (48.2K params) that,
 * unlike the image/video super-resolution models, whole clips run as a
 * single inference rather than needing to be tiled/chunked.
 */
export async function runGtcrn(
  session: InferenceSessionType,
  ort: typeof import("onnxruntime-web"),
  spec: Spectrogram
): Promise<Spectrogram> {
  const { real, imag, numFrames } = spec;
  const data = new Float32Array(GTCRN_FREQ_BINS * numFrames * 2);
  for (let f = 0; f < GTCRN_FREQ_BINS; f++) {
    for (let t = 0; t < numFrames; t++) {
      const idx = (f * numFrames + t) * 2;
      data[idx] = real[t][f];
      data[idx + 1] = imag[t][f];
    }
  }
  const tensor = new ort.Tensor("float32", data, [1, GTCRN_FREQ_BINS, numFrames, 2]) as TensorType;
  const results = await session.run({ spec: tensor });
  const output = results.spec_enh.data as Float32Array;

  const outReal: Float32Array[] = new Array(numFrames);
  const outImag: Float32Array[] = new Array(numFrames);
  for (let t = 0; t < numFrames; t++) {
    outReal[t] = new Float32Array(GTCRN_FREQ_BINS);
    outImag[t] = new Float32Array(GTCRN_FREQ_BINS);
  }
  for (let f = 0; f < GTCRN_FREQ_BINS; f++) {
    for (let t = 0; t < numFrames; t++) {
      const idx = (f * numFrames + t) * 2;
      outReal[t][f] = output[idx];
      outImag[t][f] = output[idx + 1];
    }
  }
  return { real: outReal, imag: outImag, numFrames };
}

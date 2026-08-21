import type { InferenceSession as InferenceSessionType, Tensor as TensorType } from "onnxruntime-web";
import { cachedFetchArrayBuffer } from "./modelCache";

const MODEL_URL = "/models/enhance-image/realesr-general-x4v3.onnx";
const ORT_DIR = "/ort";

// The JSEP binary adds the WebGPU execution provider on top of the same
// wasm-CPU kernels the plain binary has, so it's strictly a superset -- but
// it's roughly 2x the download, so devices without WebGPU get the smaller
// plain one instead of paying for capability they can't use.
function ortAssetNames(useWebGPU: boolean) {
  return useWebGPU
    ? { mjs: "ort-wasm-simd-threaded.jsep.mjs", wasm: "ort-wasm-simd-threaded.jsep.wasm" }
    : { mjs: "ort-wasm-simd-threaded.mjs", wasm: "ort-wasm-simd-threaded.wasm" };
}

/**
 * Checking `"gpu" in navigator` alone isn't reliable: onnxruntime-web
 * doesn't throw when a requested "webgpu" execution provider can't
 * actually be used (it logs a warning and silently falls back to wasm on
 * its own), so a session created with `executionProviders: ["webgpu",
 * "wasm"]` can succeed while quietly having used wasm the whole time --
 * which would both mislabel the result to the visitor and skip the
 * intentional "use the smaller non-JSEP wasm binary" path below.
 * Requesting a real adapter ourselves first is the actual feature test.
 */
async function hasWorkingWebGPUAdapter(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  // This project doesn't otherwise depend on @webgpu/types, so `gpu` is
  // typed minimally here rather than pulling in that package for one
  // feature check.
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
  // Self-hosted, unbundled copy of onnxruntime-web's ESM entry -- loaded via
  // a fully-qualified URL so it runs outside webpack's module system, same
  // reason and same technique as the ffmpeg worker in ffmpegClient.ts:
  // webpack can't statically bundle this module's own internal wasm
  // loading, and a same-origin runtime URL sidesteps that entirely.
  const url = `${window.location.origin}${ORT_DIR}/ort.webgpu.min.mjs`;
  return import(/* webpackIgnore: true */ url) as Promise<typeof import("onnxruntime-web")>;
}

type OrtModule = typeof import("onnxruntime-web");
type LoadedSession = { session: InferenceSessionType; usedWebGPU: boolean; ort: OrtModule };

let sessionPromise: Promise<LoadedSession> | null = null;

/**
 * Downloads (or reuses the cached copy of) the ORT wasm runtime and the
 * model weights, then creates an inference session. WebGPU is attempted
 * first when the browser supports it; if session creation with WebGPU
 * fails for any reason, this falls back to the wasm execution provider
 * automatically rather than failing the whole tool.
 */
export async function loadEnhanceSession(onProgress?: DownloadProgress): Promise<LoadedSession> {
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const ort = await loadOrtModule();
    const wantWebGPU = await hasWorkingWebGPUAdapter();
    const assets = ortAssetNames(wantWebGPU);

    // Both downloads are tracked together against one combined byte total
    // so the "Downloading AI model" progress reflects everything that has
    // to arrive before the tool is usable, not just the weights file.
    let wasmTotal = 0;
    let modelTotal = 0;
    let wasmLoaded = 0;
    let modelLoaded = 0;
    const report = () => onProgress?.(wasmLoaded + modelLoaded, wasmTotal + modelTotal || 1);

    const [wasmBinary, modelBuffer] = await Promise.all([
      cachedFetchArrayBuffer(`${ORT_DIR}/${assets.wasm}`, (loaded, total) => {
        wasmLoaded = loaded;
        wasmTotal = total;
        report();
      }),
      cachedFetchArrayBuffer(MODEL_URL, (loaded, total) => {
        modelLoaded = loaded;
        modelTotal = total;
        report();
      }),
    ]);

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
        // WebGPU is present but session creation failed (unsupported GPU,
        // driver issue, etc.) -- re-fetch the smaller plain wasm binary and
        // fall back cleanly instead of failing the tool.
        const plain = ortAssetNames(false);
        ort.env.wasm.wasmPaths = { mjs: `${ORT_DIR}/${plain.mjs}` };
        ort.env.wasm.wasmBinary = await cachedFetchArrayBuffer(`${ORT_DIR}/${plain.wasm}`);
      }
    }
    return { session: await createSession(["wasm"]), usedWebGPU: false, ort };
  })().catch((err) => {
    sessionPromise = null;
    throw err;
  });

  return sessionPromise;
}

export function resetEnhanceSession(): void {
  sessionPromise?.then(({ session }) => session.release().catch(() => {}));
  sessionPromise = null;
}

export async function runTileTensor(
  session: InferenceSessionType,
  ort: typeof import("onnxruntime-web"),
  inputNCHW: Float32Array,
  width: number,
  height: number
): Promise<Float32Array> {
  const tensor = new ort.Tensor("float32", inputNCHW, [1, 3, height, width]) as TensorType;
  const results = await session.run({ input: tensor });
  const output = results.output;
  return output.data as Float32Array;
}

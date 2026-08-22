import type { InferenceSession as InferenceSessionType, Tensor as TensorType } from "onnxruntime-web";
import { cachedFetchArrayBuffer } from "./modelCache";

const MODEL_URL = "/models/enhance-image/realesr-general-x4v3.onnx";
const ORT_DIR = "/ort";

// The JSEP binary adds the WebGPU execution provider on top of the same
// wasm-CPU kernels the plain binary has, so it's strictly a superset -- but
// it's roughly 2x the download, so devices without WebGPU get the smaller
// plain one instead of paying for capability they can't use.
// Chrome's fetch() never exposes Content-Length for `application/wasm`
// responses (confirmed directly: curl sees the header, the browser's own
// Headers.get() returns null for the exact same response) -- these known
// sizes stand in for it so download progress doesn't collapse to "total
// unknown" for by far the two largest files this tool fetches. Update if
// the onnxruntime-web version changes and these binaries are rebuilt.
function ortAssetNames(useWebGPU: boolean) {
  return useWebGPU
    ? { mjs: "ort-wasm-simd-threaded.jsep.mjs", wasm: "ort-wasm-simd-threaded.jsep.wasm", wasmSize: 26_827_543 }
    : { mjs: "ort-wasm-simd-threaded.mjs", wasm: "ort-wasm-simd-threaded.wasm", wasmSize: 13_479_978 };
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
export async function loadEnhanceSession(
  onProgress?: DownloadProgress,
  signal?: AbortSignal
): Promise<LoadedSession> {
  if (sessionPromise) return sessionPromise;

  // Captured so the cleanup below can tell whether it's still cleaning up
  // *this* attempt by the time it runs, rather than a newer one --
  // resetEnhanceSession() (called by Cancel) can null out sessionPromise and
  // a fresh attempt can start while this attempt's own rejection is still in
  // flight; without this guard, this attempt's delayed cleanup would clobber
  // that fresh, unrelated session load. Same race, same fix as loadFFmpeg's
  // loadPromise in ffmpegClient.ts.
  const attempt: Promise<LoadedSession> = (async () => {
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
    const report = () => {
      const combinedTotal = wasmTotal + modelTotal;
      if (combinedTotal > 0) onProgress?.(wasmLoaded + modelLoaded, combinedTotal);
    };

    // Promise.all would leave whichever of these two settles *second*
    // unobserved once the first one rejects (both share the same abort
    // signal, so cancelling reliably rejects both) -- an unhandled
    // rejection that surfaced as a real console/pageerror even though the
    // cancellation itself was handled correctly. allSettled keeps both
    // promises properly awaited no matter which one rejects first.
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
        signal
      ),
    ]);
    if (wasmResult.status === "rejected") throw wasmResult.reason;
    if (modelResult.status === "rejected") throw modelResult.reason;
    const wasmBinary = wasmResult.value;
    const modelBuffer = modelResult.value;

    // A cancellation that lands in the gap between the downloads settling
    // and session creation starting would otherwise go unnoticed here --
    // creating a session nobody wants is wasted work at best.
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
        // WebGPU is present but session creation failed (unsupported GPU,
        // driver issue, etc.) -- re-fetch the smaller plain wasm binary and
        // fall back cleanly instead of failing the tool.
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

export function resetEnhanceSession(): void {
  // cancel() calls this on a sessionPromise that may currently be
  // *rejecting* (that's exactly what aborting the in-flight download it's
  // awaiting does) -- a bare `.then()` with no rejection handler on that
  // promise is an unhandled rejection waiting to happen, not a hypothetical
  // one; it reliably fired as a real console/pageerror on every cancel.
  sessionPromise
    ?.then(({ session }) => session.release())
    .catch(() => {});
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

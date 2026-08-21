import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(rootDir, "public");
const wasmDir = path.join(publicDir, "wasm");
const ffmpegDir = path.join(publicDir, "ffmpeg");
const ortDir = path.join(publicDir, "ort");

mkdirSync(publicDir, { recursive: true });
mkdirSync(wasmDir, { recursive: true });
mkdirSync(ffmpegDir, { recursive: true });
mkdirSync(ortDir, { recursive: true });

const assets = [
  {
    src: "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    dest: path.join(publicDir, "pdf.worker.min.mjs"),
  },
  {
    src: "node_modules/pdfjs-dist/legacy/build/pdf.min.mjs",
    dest: path.join(publicDir, "pdf.min.mjs"),
  },
  {
    src: "node_modules/@jsquash/avif/codec/enc/avif_enc.wasm",
    dest: path.join(wasmDir, "avif_enc.wasm"),
  },
  {
    src: "node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js",
    dest: path.join(ffmpegDir, "ffmpeg-core.js"),
  },
  {
    src: "node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm",
    dest: path.join(ffmpegDir, "ffmpeg-core.wasm"),
  },
  // Self-hosted, unbundled copy of the @ffmpeg/ffmpeg worker (plus the two
  // leaf modules it imports). Loaded via classWorkerURL so it runs outside
  // webpack's module system entirely -- see src/lib/ffmpegClient.ts for why.
  {
    src: "node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js",
    dest: path.join(ffmpegDir, "worker.js"),
  },
  {
    src: "node_modules/@ffmpeg/ffmpeg/dist/esm/const.js",
    dest: path.join(ffmpegDir, "const.js"),
  },
  {
    src: "node_modules/@ffmpeg/ffmpeg/dist/esm/errors.js",
    dest: path.join(ffmpegDir, "errors.js"),
  },
  // onnxruntime-web's runtime, for the image enhancer tool. The ".min.mjs"
  // (not ".bundle.min.mjs") build is the "extern wasm" flavor that fetches
  // its wasm binary as a separate file at a configurable path instead of
  // resolving it relative to import.meta.url -- which, like the ffmpeg
  // worker above, doesn't survive webpack bundling. Both the plain (wasm
  // execution provider only) and jsep (adds the WebGPU execution provider)
  // wasm binaries are shipped so a device without WebGPU downloads only the
  // smaller plain one -- see src/lib/onnxRuntime.ts.
  {
    src: "node_modules/onnxruntime-web/dist/ort.webgpu.min.mjs",
    dest: path.join(ortDir, "ort.webgpu.min.mjs"),
  },
  {
    src: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs",
    dest: path.join(ortDir, "ort-wasm-simd-threaded.mjs"),
  },
  {
    src: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm",
    dest: path.join(ortDir, "ort-wasm-simd-threaded.wasm"),
  },
  {
    src: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs",
    dest: path.join(ortDir, "ort-wasm-simd-threaded.jsep.mjs"),
  },
  {
    src: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm",
    dest: path.join(ortDir, "ort-wasm-simd-threaded.jsep.wasm"),
  },
];

for (const asset of assets) {
  copyFileSync(path.join(rootDir, asset.src), asset.dest);
  console.log(`Copied ${asset.src} -> ${path.relative(rootDir, asset.dest)}`);
}

import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(rootDir, "public");
const wasmDir = path.join(publicDir, "wasm");
const ffmpegDir = path.join(publicDir, "ffmpeg");
const ffmpegMtDir = path.join(publicDir, "ffmpeg-mt");

mkdirSync(publicDir, { recursive: true });
mkdirSync(wasmDir, { recursive: true });
mkdirSync(ffmpegDir, { recursive: true });
mkdirSync(ffmpegMtDir, { recursive: true });

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
  // Multi-threaded ffmpeg-core build (needs cross-origin isolation --
  // COOP/COEP headers, set in next.config.ts -- to use SharedArrayBuffer).
  // Used when available for dramatically faster encodes; falls back to the
  // single-threaded core above otherwise. See src/lib/ffmpegClient.ts.
  {
    src: "node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.js",
    dest: path.join(ffmpegMtDir, "ffmpeg-core.js"),
  },
  {
    src: "node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.wasm",
    dest: path.join(ffmpegMtDir, "ffmpeg-core.wasm"),
  },
  {
    src: "node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.worker.js",
    dest: path.join(ffmpegMtDir, "ffmpeg-core.worker.js"),
  },
];

for (const asset of assets) {
  copyFileSync(path.join(rootDir, asset.src), asset.dest);
  console.log(`Copied ${asset.src} -> ${path.relative(rootDir, asset.dest)}`);
}

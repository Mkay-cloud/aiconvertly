import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(rootDir, "public");
const wasmDir = path.join(publicDir, "wasm");

mkdirSync(publicDir, { recursive: true });
mkdirSync(wasmDir, { recursive: true });

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
];

for (const asset of assets) {
  copyFileSync(path.join(rootDir, asset.src), asset.dest);
  console.log(`Copied ${asset.src} -> ${path.relative(rootDir, asset.dest)}`);
}

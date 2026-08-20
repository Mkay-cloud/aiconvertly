import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(
  rootDir,
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
);
const destDir = path.join(rootDir, "public");
const dest = path.join(destDir, "pdf.worker.min.mjs");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);

console.log("Copied pdf.worker.min.mjs to /public");

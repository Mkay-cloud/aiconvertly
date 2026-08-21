// pdfjs-dist ships as a pure ES module, which trips up webpack's CJS/ESM
// interop when dynamically imported as a bundled dependency (throws
// "Object.defineProperty called on non-object" from inside
// __webpack_require__.r). Loading it as a real browser-native dynamic
// import of a static asset sidesteps webpack's module wrapper entirely.
type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

export async function getPdfjs(): Promise<PdfjsModule> {
  // @ts-expect-error -- runtime-only static asset path, not a resolvable module for TS
  const pdfjsLib: PdfjsModule = await import(/* webpackIgnore: true */ "/pdf.min.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

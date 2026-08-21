"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { formatBytes } from "@/lib/format";
import { downloadBytes, fileBaseName } from "@/lib/download";
import { parsePageRanges } from "@/lib/pageRanges";
import { sleep } from "@/lib/sleep";
import { useHandoffFile } from "@/lib/useHandoffFile";

type Mode = "range" | "each";

export function SplitPdfClient() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("range");
  const [rangeInput, setRangeInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useHandoffFile((file) => handleFiles([file]));

  async function handleFiles(files: File[]) {
    const selected = files[0];
    if (!selected) return;
    setError(null);
    setFile(selected);
    setBytes(null);
    setPageCount(null);
    try {
      const data = new Uint8Array(await selected.arrayBuffer());
      const doc = await PDFDocument.load(data, { ignoreEncryption: true });
      setBytes(data);
      setPageCount(doc.getPageCount());
    } catch {
      setError("Couldn't read this PDF. It may be corrupted or password protected.");
    }
  }

  async function handleExtractRange() {
    if (!bytes || !pageCount || !file) return;
    setError(null);
    setIsProcessing(true);
    try {
      const indices = parsePageRanges(rangeInput, pageCount);
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, indices);
      pages.forEach((page) => out.addPage(page));
      const outBytes = await out.save();
      downloadBytes(
        outBytes,
        `${fileBaseName(file.name)}-extracted.pdf`,
        "application/pdf"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSplitEach() {
    if (!bytes || !pageCount || !file) return;
    setError(null);
    setIsProcessing(true);
    try {
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const base = fileBaseName(file.name);
      const padWidth = String(pageCount).length;
      for (let i = 0; i < pageCount; i += 1) {
        const out = await PDFDocument.create();
        const [page] = await out.copyPages(src, [i]);
        out.addPage(page);
        const outBytes = await out.save();
        const pageNumber = String(i + 1).padStart(padWidth, "0");
        downloadBytes(outBytes, `${base}-page-${pageNumber}.pdf`, "application/pdf");
        if (i < pageCount - 1) await sleep(250);
      }
    } catch {
      setError("Something went wrong while splitting your PDF.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="application/pdf,.pdf"
        onFiles={handleFiles}
        label="Drop a PDF here or click to browse"
        hint="Choose a single PDF to split"
      />

      {file && (
        <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg text-accent">
            {pageCount === null && !error ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <span className="text-xs font-semibold">PDF</span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-sm font-medium text-foreground">
              {file.name}
            </p>
            <p className="text-xs text-secondary">
              {pageCount
                ? `${pageCount} page${pageCount === 1 ? "" : "s"} · ${formatBytes(file.size)}`
                : "Reading…"}
            </p>
          </div>
        </div>
      )}

      {pageCount !== null && (
        <div className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("range")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                mode === "range"
                  ? "bg-accent text-accent-foreground"
                  : "text-secondary hover:text-foreground"
              }`}
            >
              Extract pages
            </button>
            <button
              type="button"
              onClick={() => setMode("each")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                mode === "each"
                  ? "bg-accent text-accent-foreground"
                  : "text-secondary hover:text-foreground"
              }`}
            >
              Split every page
            </button>
          </div>

          {mode === "range" ? (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-2 text-sm text-secondary">
                Pages to extract
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(event) => setRangeInput(event.target.value)}
                  placeholder={`e.g. 1-3, 5 (of ${pageCount})`}
                  className="rounded-lg border border-card-border bg-bg px-4 py-2.5 text-foreground outline-none placeholder:text-secondary/60 focus:border-accent"
                />
              </label>
              <Button
                onClick={handleExtractRange}
                disabled={isProcessing || !rangeInput.trim()}
                className="self-start"
              >
                {isProcessing && <Spinner className="h-4 w-4" />}
                {isProcessing ? "Extracting…" : "Extract pages"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-secondary">
                Creates {pageCount} separate PDF files, one per page, and
                downloads them one after another.
              </p>
              <Button
                onClick={handleSplitEach}
                disabled={isProcessing}
                className="self-start"
              >
                {isProcessing && <Spinner className="h-4 w-4" />}
                {isProcessing ? "Splitting…" : `Split into ${pageCount} files`}
              </Button>
            </div>
          )}
        </div>
      )}

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

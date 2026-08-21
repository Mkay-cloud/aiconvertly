"use client";

import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { formatBytes } from "@/lib/format";
import { downloadBytes, fileBaseName } from "@/lib/download";
import { parsePageRanges } from "@/lib/pageRanges";
import { useHandoffFile } from "@/lib/useHandoffFile";

type Scope = "all" | "custom";

const angleOptions = [
  { value: 90, label: "90° right" },
  { value: 180, label: "180°" },
  { value: 270, label: "90° left" },
];

export function RotatePdfClient() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [angle, setAngle] = useState(90);
  const [scope, setScope] = useState<Scope>("all");
  const [customPages, setCustomPages] = useState("");
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

  async function handleRotate() {
    if (!bytes || !pageCount || !file) return;
    setError(null);
    setIsProcessing(true);
    try {
      const indices =
        scope === "all"
          ? Array.from({ length: pageCount }, (_, i) => i)
          : parsePageRanges(customPages, pageCount);

      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = doc.getPages();
      for (const index of indices) {
        const page = pages[index];
        const current = page.getRotation().angle;
        page.setRotation(degrees((current + angle) % 360));
      }
      const outBytes = await doc.save();
      downloadBytes(
        outBytes,
        `${fileBaseName(file.name)}-rotated.pdf`,
        "application/pdf"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
        hint="Choose a single PDF to rotate"
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
        <div className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-6">
          <div className="flex flex-col gap-3">
            <span className="text-sm text-secondary">Rotation</span>
            <div className="flex flex-wrap gap-2">
              {angleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAngle(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    angle === option.value
                      ? "bg-accent text-accent-foreground"
                      : "border border-card-border text-secondary hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm text-secondary">Apply to</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setScope("all")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  scope === "all"
                    ? "bg-accent text-accent-foreground"
                    : "border border-card-border text-secondary hover:text-foreground"
                }`}
              >
                All pages
              </button>
              <button
                type="button"
                onClick={() => setScope("custom")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  scope === "custom"
                    ? "bg-accent text-accent-foreground"
                    : "border border-card-border text-secondary hover:text-foreground"
                }`}
              >
                Specific pages
              </button>
            </div>
            {scope === "custom" && (
              <input
                type="text"
                value={customPages}
                onChange={(event) => setCustomPages(event.target.value)}
                placeholder={`e.g. 1-3, 5 (of ${pageCount})`}
                className="rounded-lg border border-card-border bg-bg px-4 py-2.5 text-foreground outline-none placeholder:text-secondary/60 focus:border-accent"
              />
            )}
          </div>

          <Button
            onClick={handleRotate}
            disabled={
              isProcessing || (scope === "custom" && !customPages.trim())
            }
            className="self-start"
          >
            {isProcessing && <Spinner className="h-4 w-4" />}
            {isProcessing ? "Rotating…" : "Rotate PDF"}
          </Button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Dropzone } from "@/components/Dropzone";
import { FileRow } from "@/components/FileRow";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/download";
import { useHandoffFile } from "@/lib/useHandoffFile";

type PdfItem = {
  id: string;
  file: File;
  pageCount: number | null;
  bytes: Uint8Array | null;
  error: string | null;
};

export function MergePdfClient() {
  const [items, setItems] = useState<PdfItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useHandoffFile((file) => addFiles([file]));

  async function addFiles(files: File[]) {
    setError(null);
    const newItems: PdfItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      pageCount: null,
      bytes: null,
      error: null,
    }));
    setItems((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pageCount = doc.getPageCount();
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, bytes, pageCount } : p
          )
        );
      } catch {
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, error: "Couldn't read this PDF" }
              : p
          )
        );
      }
    }
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const readyItems = items.filter((item) => item.bytes);
  const canMerge = readyItems.length >= 2 && !isProcessing;

  async function handleMerge() {
    setIsProcessing(true);
    setError(null);
    try {
      const merged = await PDFDocument.create();
      for (const item of items) {
        if (!item.bytes) continue;
        const src = await PDFDocument.load(item.bytes, {
          ignoreEncryption: true,
        });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }
      const bytes = await merged.save();
      downloadBytes(bytes, "merged.pdf", "application/pdf");
    } catch {
      setError("Something went wrong while merging your files. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="application/pdf,.pdf"
        multiple
        onFiles={addFiles}
        label="Drop PDF files here or click to browse"
        hint="Add two or more PDFs to merge them, in the order you choose"
      />

      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <FileRow
              key={item.id}
              leading={
                item.error ? (
                  <span className="text-red-400">!</span>
                ) : item.pageCount === null ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-semibold">PDF</span>
                )
              }
              title={item.file.name}
              subtitle={
                item.error
                  ? item.error
                  : item.pageCount === null
                    ? "Reading…"
                    : `${item.pageCount} page${item.pageCount === 1 ? "" : "s"} · ${formatBytes(item.file.size)}`
              }
              canMoveUp={index > 0}
              canMoveDown={index < items.length - 1}
              onMoveUp={() => moveItem(index, -1)}
              onMoveDown={() => moveItem(index, 1)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button onClick={handleMerge} disabled={!canMerge}>
          {isProcessing && <Spinner className="h-4 w-4" />}
          {isProcessing ? "Merging…" : "Merge PDFs"}
        </Button>
        {readyItems.length === 1 && (
          <p className="text-sm text-secondary">Add one more PDF to merge.</p>
        )}
      </div>
    </div>
  );
}

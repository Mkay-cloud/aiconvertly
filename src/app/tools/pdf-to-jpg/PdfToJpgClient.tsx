"use client";

import { useEffect, useRef, useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { downloadBlob, fileBaseName } from "@/lib/download";
import { getPdfjs } from "@/lib/pdfjs";
import { sleep } from "@/lib/sleep";
import { useHandoffFile } from "@/lib/useHandoffFile";

type PageImage = {
  pageNumber: number;
  url: string;
  blob: Blob;
};

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't render page"))),
      "image/jpeg",
      0.92
    );
  });
}

export function PdfToJpgClient() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageImage[]>([]);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = pageUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useHandoffFile((file) => handleFiles([file]));

  async function handleFiles(files: File[]) {
    const selected = files[0];
    if (!selected) return;

    pageUrls.current.forEach((url) => URL.revokeObjectURL(url));
    pageUrls.current = [];

    setError(null);
    setFile(selected);
    setPages([]);
    setTotalPages(null);
    setIsConverting(true);

    try {
      const pdfjsLib = await getPdfjs();
      const data = new Uint8Array(await selected.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      setTotalPages(pdf.numPages);

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas isn't supported in this browser");

        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const blob = await canvasToJpegBlob(canvas);
        const url = URL.createObjectURL(blob);
        pageUrls.current.push(url);
        setPages((prev) => [...prev, { pageNumber, url, blob }]);
      }
    } catch {
      setError("Couldn't read this PDF. It may be corrupted or password protected.");
    } finally {
      setIsConverting(false);
    }
  }

  async function handleDownloadAll() {
    if (!file) return;
    setIsDownloadingAll(true);
    const base = fileBaseName(file.name);
    const padWidth = String(pages.length).length;
    for (const page of pages) {
      const pageNumber = String(page.pageNumber).padStart(padWidth, "0");
      downloadBlob(page.blob, `${base}-page-${pageNumber}.jpg`);
      await sleep(200);
    }
    setIsDownloadingAll(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="application/pdf,.pdf"
        onFiles={handleFiles}
        label="Drop a PDF here or click to browse"
        hint="Every page will be converted into a downloadable JPG"
      />

      {error && <Alert>{error}</Alert>}

      {isConverting && (
        <div className="flex items-center gap-3 text-sm text-secondary">
          <Spinner className="h-4 w-4" />
          Converting page {pages.length + 1}
          {totalPages ? ` of ${totalPages}` : ""}…
        </div>
      )}

      {pages.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-secondary">
              {pages.length} page{pages.length === 1 ? "" : "s"} converted
            </p>
            <Button
              size="sm"
              onClick={handleDownloadAll}
              disabled={isDownloadingAll || isConverting}
            >
              {isDownloadingAll && <Spinner className="h-4 w-4" />}
              {isDownloadingAll ? "Downloading…" : "Download all"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {pages.map((page) => (
              <div
                key={page.pageNumber}
                className="flex flex-col gap-2 rounded-xl border border-card-border bg-card p-3"
              >
                <div className="overflow-hidden rounded-lg bg-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={page.url}
                    alt={`Page ${page.pageNumber}`}
                    className="h-auto w-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-secondary">
                    Page {page.pageNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      downloadBlob(
                        page.blob,
                        `${fileBaseName(file?.name ?? "page")}-page-${page.pageNumber}.jpg`
                      )
                    }
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

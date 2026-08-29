"use client";

import { useEffect, useRef, useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { downloadBlob, fileBaseName } from "@/lib/download";
import { decodeToCanvas } from "@/lib/decodeImage";
import { encodeImage } from "@/lib/encodeImage";
import { imageFormats } from "@/lib/imageFormats";
import { guessFormatFromFile } from "@/lib/guessFormat";
import { readExifSummary, type ExifTag } from "@/lib/exif";
import { sleep } from "@/lib/sleep";
import { useHandoffFile } from "@/lib/useHandoffFile";

type Item = {
  id: string;
  originalName: string;
  outputName: string;
  tags: ExifTag[];
  hasExif: boolean;
  blob: Blob | null;
  url: string;
  error: string | null;
};

export function RemoveExifDataClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useHandoffFile((file) => handleFiles([file]));

  async function handleFiles(files: File[]) {
    setIsProcessing(true);
    for (const file of files) {
      const id = crypto.randomUUID();
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const summary = readExifSummary(bytes);
        const canvas = await decodeToCanvas(file);
        const format = guessFormatFromFile(file);
        const blob = await encodeImage(canvas, format, 95);
        const url = URL.createObjectURL(blob);
        objectUrls.current.push(url);
        const outputName = `${fileBaseName(file.name)}-clean.${imageFormats[format].extension}`;
        setItems((prev) => [
          ...prev,
          {
            id,
            originalName: file.name,
            outputName,
            tags: summary.tags,
            hasExif: summary.hasExif,
            blob,
            url,
            error: null,
          },
        ]);
      } catch {
        setItems((prev) => [
          ...prev,
          {
            id,
            originalName: file.name,
            outputName: file.name,
            tags: [],
            hasExif: false,
            blob: null,
            url: "",
            error: "Couldn't process this file.",
          },
        ]);
      }
    }
    setIsProcessing(false);
  }

  const cleanedItems = items.filter((item) => item.blob);

  async function handleDownloadAll() {
    setIsDownloadingAll(true);
    for (const item of cleanedItems) {
      if (item.blob) downloadBlob(item.blob, item.outputName);
      await sleep(200);
    }
    setIsDownloadingAll(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tif,.tiff"
        multiple
        onFiles={handleFiles}
        label="Drop photos here or click to browse"
        hint="We'll show what's hidden inside, then strip it out"
      />

      {isProcessing && (
        <div className="flex items-center gap-3 text-sm text-secondary">
          <Spinner className="h-4 w-4" /> Scanning for metadata…
        </div>
      )}

      {cleanedItems.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-secondary">
            {cleanedItems.length} photo{cleanedItems.length === 1 ? "" : "s"} ready
          </p>
          <Button size="sm" onClick={handleDownloadAll} disabled={isDownloadingAll}>
            {isDownloadingAll && <Spinner className="h-4 w-4" />}
            {isDownloadingAll ? "Downloading…" : "Download all cleaned"}
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">{item.originalName}</p>
                {/* Same light-mode contrast fix as Alert.tsx's own comment. */}
                {item.error ? (
                  <p className="text-xs text-red-700 dark:text-red-400">{item.error}</p>
                ) : item.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag.label}
                        className="rounded-full border border-card-border bg-bg px-2.5 py-1 text-xs text-secondary"
                      >
                        <span className="text-foreground">{tag.label}:</span> {tag.value}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-secondary">
                    {item.hasExif ? "Metadata found, no readable details" : "No metadata found"}
                  </p>
                )}
              </div>
              {item.blob && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadBlob(item.blob!, item.outputName)}
                  className="shrink-0 self-start sm:self-auto"
                >
                  Download clean copy
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {items.some((item) => item.error) && (
        <Alert>Some files couldn&apos;t be processed — see details above.</Alert>
      )}
    </div>
  );
}

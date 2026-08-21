"use client";

import { useEffect, useRef, useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { downloadBlob } from "@/lib/download";
import { sleep } from "@/lib/sleep";

type ConvertedImage = {
  id: string;
  name: string;
  url: string;
  blob: Blob;
  error: string | null;
};

export function BatchImageConvertClient({
  accept,
  multiple = true,
  label,
  hint,
  convert,
  outputName,
  errorMessage = "Couldn't convert this file.",
  extraControls,
}: {
  accept: string;
  multiple?: boolean;
  label: string;
  hint: string;
  convert: (file: File) => Promise<Blob>;
  outputName: (file: File) => string;
  errorMessage?: string;
  extraControls?: React.ReactNode;
}) {
  const [items, setItems] = useState<ConvertedImage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  async function handleFiles(files: File[]) {
    setIsConverting(true);
    for (const file of files) {
      const id = crypto.randomUUID();
      const name = outputName(file);
      try {
        const blob = await convert(file);
        const url = URL.createObjectURL(blob);
        objectUrls.current.push(url);
        setItems((prev) => [...prev, { id, name, url, blob, error: null }]);
      } catch {
        setItems((prev) => [
          ...prev,
          { id, name: file.name, url: "", blob: new Blob(), error: errorMessage },
        ]);
      }
    }
    setIsConverting(false);
  }

  const successfulItems = items.filter((item) => !item.error);

  async function handleDownloadAll() {
    setIsDownloadingAll(true);
    for (const item of successfulItems) {
      downloadBlob(item.blob, item.name);
      await sleep(200);
    }
    setIsDownloadingAll(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {extraControls}

      <Dropzone
        accept={accept}
        multiple={multiple}
        onFiles={handleFiles}
        label={label}
        hint={hint}
      />

      {isConverting && (
        <div className="flex items-center gap-3 text-sm text-secondary">
          <Spinner className="h-4 w-4" />
          Converting…
        </div>
      )}

      {items.some((item) => item.error) && (
        <Alert>Some files couldn&apos;t be converted — see details below.</Alert>
      )}

      {items.length > 0 && (
        <>
          {successfulItems.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary">
                {successfulItems.length} file{successfulItems.length === 1 ? "" : "s"} converted
              </p>
              <Button size="sm" onClick={handleDownloadAll} disabled={isDownloadingAll}>
                {isDownloadingAll && <Spinner className="h-4 w-4" />}
                {isDownloadingAll ? "Downloading…" : "Download all"}
              </Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-xl border border-card-border bg-card p-3"
              >
                {item.error ? (
                  <div className="flex aspect-square items-center justify-center rounded-lg bg-bg p-3 text-center text-xs text-red-400">
                    {item.error}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.name}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-secondary">{item.name}</span>
                  {!item.error && (
                    <button
                      type="button"
                      onClick={() => downloadBlob(item.blob, item.name)}
                      className="shrink-0 text-xs font-medium text-accent hover:underline"
                    >
                      Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

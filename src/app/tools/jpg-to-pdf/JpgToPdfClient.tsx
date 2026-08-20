"use client";

import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Dropzone } from "@/components/Dropzone";
import { FileRow } from "@/components/FileRow";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/download";

type ImageItem = {
  id: string;
  file: File;
  url: string;
};

const SUPPORTED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);

export function JpgToPdfClient() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function addFiles(files: File[]) {
    const supported = files.filter((file) => SUPPORTED_TYPES.has(file.type));
    const skipped = files.length - supported.length;

    const newItems = supported.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      return { id: crypto.randomUUID(), file, url };
    });

    setItems((prev) => [...prev, ...newItems]);
    setError(
      skipped > 0
        ? `${skipped} file${skipped === 1 ? "" : "s"} skipped — only JPG and PNG images are supported.`
        : null
    );
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

  async function handleConvert() {
    if (items.length === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      const doc = await PDFDocument.create();
      for (const item of items) {
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        const image =
          item.file.type === "image/png"
            ? await doc.embedPng(bytes)
            : await doc.embedJpg(bytes);
        const page = doc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }
      const outBytes = await doc.save();
      downloadBytes(outBytes, "images.pdf", "application/pdf");
    } catch {
      setError("Something went wrong while creating your PDF.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        multiple
        onFiles={addFiles}
        label="Drop JPG or PNG images here or click to browse"
        hint="Add one or more images to combine into a single PDF"
      />

      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <FileRow
              key={item.id}
              leading={
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              }
              title={item.file.name}
              subtitle={formatBytes(item.file.size)}
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

      <Button onClick={handleConvert} disabled={items.length === 0 || isProcessing} className="self-start">
        {isProcessing && <Spinner className="h-4 w-4" />}
        {isProcessing ? "Creating PDF…" : "Convert to PDF"}
      </Button>
    </div>
  );
}

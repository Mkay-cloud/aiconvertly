"use client";

import { useEffect, useRef, useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { formatBytes } from "@/lib/format";
import { downloadBlob, fileBaseName } from "@/lib/download";
import { decodeToCanvas } from "@/lib/decodeImage";
import { encodeImage } from "@/lib/encodeImage";
import {
  imageFormatList,
  imageFormats,
  universalConverterAccept,
  type ImageFormatId,
} from "@/lib/imageFormats";
import { canvasToBlob } from "@/lib/canvasImage";
import { useHandoffFile } from "@/lib/useHandoffFile";

type Result = { blob: Blob; url: string; name: string };

export function ImageConverterClient() {
  const [file, setFile] = useState<File | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<ImageFormatId>("png");
  const [quality, setQuality] = useState(85);
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useHandoffFile((file) => handleFiles([file]));

  async function handleFiles(files: File[]) {
    const selected = files[0];
    if (!selected) return;
    setError(null);
    setFile(selected);
    setResult(null);
    setDimensions(null);
    setPreviewUrl(null);
    setIsLoading(true);
    try {
      const canvas = await decodeToCanvas(selected);
      canvasRef.current = canvas;
      setDimensions({ width: canvas.width, height: canvas.height });
      const previewBlob = await canvasToBlob(canvas, "image/png");
      const url = URL.createObjectURL(previewBlob);
      objectUrls.current.push(url);
      setPreviewUrl(url);
    } catch {
      setError("Couldn't read this image. It may be corrupted or in an unsupported format.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConvert() {
    if (!canvasRef.current || !file) return;
    setIsConverting(true);
    setError(null);
    setResult(null);
    try {
      const blob = await encodeImage(canvasRef.current, format, quality);
      const url = URL.createObjectURL(blob);
      objectUrls.current.push(url);
      const name = `${fileBaseName(file.name)}.${imageFormats[format].extension}`;
      setResult({ blob, url, name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong during conversion.");
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept={universalConverterAccept}
        onFiles={handleFiles}
        label="Drop an image here or click to browse"
        hint="JPG, PNG, WebP, GIF, BMP, AVIF, or TIFF"
      />

      {isLoading && (
        <div className="flex items-center gap-3 text-sm text-secondary">
          <Spinner className="h-4 w-4" /> Reading image…
        </div>
      )}

      {file && dimensions && (
        <div className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-6 sm:flex-row">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={file.name}
              className="h-40 w-40 shrink-0 self-start rounded-lg border border-card-border bg-bg object-contain"
            />
          )}
          <div className="flex flex-1 flex-col gap-5">
            <div>
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-secondary">
                {dimensions.width} × {dimensions.height}px · {formatBytes(file.size)}
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm text-secondary">
              Convert to
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value as ImageFormatId)}
                className="rounded-lg border border-card-border bg-bg px-4 py-2.5 text-foreground outline-none focus:border-accent"
              >
                {imageFormatList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            {imageFormats[format].supportsQuality && (
              <label className="flex flex-col gap-2 text-sm text-secondary">
                Quality: {quality}
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="accent-accent"
                />
              </label>
            )}

            <Button onClick={handleConvert} disabled={isConverting} className="self-start">
              {isConverting && <Spinner className="h-4 w-4" />}
              {isConverting ? "Converting…" : `Convert to ${imageFormats[format].label}`}
            </Button>
          </div>
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      {result && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-card-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{result.name}</p>
            <p className="text-xs text-secondary">{formatBytes(result.blob.size)}</p>
          </div>
          <Button onClick={() => downloadBlob(result.blob, result.name)}>Download</Button>
        </div>
      )}
    </div>
  );
}

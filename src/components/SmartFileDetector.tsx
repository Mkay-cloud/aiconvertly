"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Alert";
import { detectFileType, type DetectedKind } from "@/lib/detectFileType";
import { getRouteOptions } from "@/lib/fileRouting";
import { setPendingFile } from "@/lib/handoffFile";
import { formatBytes } from "@/lib/format";

export function SmartFileDetector() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<DetectedKind | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  async function handleFiles(files: File[]) {
    const selected = files[0];
    if (!selected) return;
    setFile(selected);
    setKind(null);
    setIsDetecting(true);
    const detected = await detectFileType(selected);
    setKind(detected);
    setIsDetecting(false);
  }

  function goToTool(slug: string) {
    if (!file) return;
    setPendingFile(file);
    router.push(`/tools/${slug}`);
  }

  function reset() {
    setFile(null);
    setKind(null);
  }

  const options = kind ? getRouteOptions(kind) : [];

  return (
    <div className="w-full max-w-2xl text-left">
      {!file ? (
        <Dropzone
          accept="application/pdf,image/*,.pdf,.heic,.heif,.tif,.tiff"
          onFiles={handleFiles}
          label="Drop a PDF or image here to see what you can do with it"
          hint="We'll detect the file type and take you straight to the right tool"
        />
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-secondary">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="shrink-0 text-xs font-medium text-secondary transition-colors hover:text-foreground"
            >
              Choose another file
            </button>
          </div>

          {isDetecting && (
            <div className="flex items-center gap-2 text-sm text-secondary">
              <Spinner className="h-4 w-4" /> Detecting file type…
            </div>
          )}

          {kind && kind.category !== "unknown" && options.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                Detected {kind.label} — here&apos;s what you can do
              </p>
              <div className="flex flex-wrap gap-2">
                {options.map((option, index) => (
                  <Button
                    key={option.slug + option.actionLabel}
                    variant={index === 0 ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => goToTool(option.slug)}
                  >
                    {option.actionLabel}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {kind && (kind.category === "unknown" || options.length === 0) && (
            <p className="text-sm text-secondary">
              We don&apos;t have a tool for that file type yet.{" "}
              <a href="#tools" className="font-medium text-accent hover:underline">
                Browse all tools
              </a>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}

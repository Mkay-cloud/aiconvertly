"use client";

import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/Button";
import { Alert, Spinner } from "@/components/Alert";
import { ProgressBar } from "@/components/ProgressBar";
import { LargeFileWarning } from "@/components/LargeFileWarning";
import { formatBytes } from "@/lib/format";
import { downloadBytes, fileBaseName } from "@/lib/download";
import { useHandoffFile } from "@/lib/useHandoffFile";
import { useFfmpegOperation } from "@/lib/useFfmpegOperation";
import { execFfmpeg, inputFileName, readAndValidateOutput, writeInputFile } from "@/lib/ffmpegIO";
import { audioEncodeArgs, audioFormats, type AudioFormatId } from "@/lib/mediaFormats";
import { useRemoveNoiseAIOperation } from "@/lib/useRemoveNoiseAIOperation";

type Engine = "standard" | "ai";

type Result = { bytes: Uint8Array; name: string; mime: string; note: string };

// afftdn (adaptive FFT denoiser) handles steady/tonal noise (hum, fan hiss)
// well on its own; anlmdn (non-local means) is layered on top for a bit of
// extra broadband smoothing. Parameters tuned and verified against real
// noisy test audio (steady fan/hum and complex traffic/typing/crosstalk
// clips) before being set here -- see the PR description for the actual
// before/after noise-floor measurements: ~6dB reduction on steady noise,
// ~4.4dB on complex noise, matching the "works well on steady noise, less
// effective on complex noise" framing shown to the visitor below.
const STANDARD_DENOISE_FILTER = "afftdn=nr=97:nf=-25:tn=1,anlmdn=s=15:p=0.003:r=0.01";

function detectAudioFormat(fileName: string): AudioFormatId {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  const ext = match ? match[1].toLowerCase() : "";
  return ext === "wav" || ext === "ogg" ? ext : "mp3";
}

export function RemoveNoiseClient() {
  const [file, setFile] = useState<File | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const ffmpegOp = useFfmpegOperation();
  const aiOp = useRemoveNoiseAIOperation();

  function handleFiles(files: File[]) {
    const selected = files[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);
    ffmpegOp.setError(null);
    aiOp.setError(null);
  }

  useHandoffFile((f) => handleFiles([f]));

  async function handleStandard() {
    if (!file) return;
    setResult(null);
    const format = detectAudioFormat(file.name);
    const target = audioFormats[format];
    await ffmpegOp.run(async (ffmpeg) => {
      const inputName = inputFileName(file, "mp3");
      const outputName = `output.${target.extension}`;
      await writeInputFile(ffmpeg, inputName, file);
      await execFfmpeg(ffmpeg, ["-i", inputName, "-af", STANDARD_DENOISE_FILTER, ...audioEncodeArgs(format), outputName]);
      const data = await readAndValidateOutput(ffmpeg, outputName, target.id);
      setResult({
        bytes: data,
        name: `${fileBaseName(file.name)}-denoised.${target.extension}`,
        mime: target.mime,
        note: "Standard engine (adaptive filter)",
      });
    });
  }

  async function handleAI() {
    if (!file) return;
    setResult(null);
    const enhanced = await aiOp.run(file);
    if (!enhanced) return;
    setResult({
      bytes: enhanced.bytes,
      name: `${fileBaseName(file.name)}-denoised.wav`,
      mime: "audio/wav",
      note: `AI-Powered engine (GTCRN) · 16kHz mono · ${enhanced.usedWebGPU ? "your GPU (WebGPU)" : "CPU (WebAssembly)"}`,
    });
  }

  function handleProcess() {
    if (engine === "standard") handleStandard();
    else if (engine === "ai") handleAI();
  }

  const isStandardBusy = ffmpegOp.isLoadingCore || ffmpegOp.isProcessing;
  const isAIBusy = aiOp.phase !== "idle";
  const isBusy = isStandardBusy || isAIBusy;
  const error = ffmpegOp.error || aiOp.error;

  function handleCancel() {
    ffmpegOp.cancel();
    aiOp.cancel();
  }

  return (
    <div className="flex flex-col gap-6">
      <Dropzone
        accept="audio/mpeg,audio/wav,audio/ogg,audio/x-wav,.mp3,.wav,.ogg,.m4a"
        onFiles={handleFiles}
        label="Drop an audio file here or click to browse"
        hint="Choose an engine below, then remove background noise"
      />

      {file && (
        <div className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-6">
          <p className="text-sm text-secondary">
            {file.name} · {formatBytes(file.size)}
          </p>
          <LargeFileWarning file={file} />

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Choose an engine</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <EngineOption
                title="Standard"
                badge="Faster"
                description="Fast processing. Works well on steady background noise like hum, fan noise, or hiss. Less effective on complex or changing noise (voices, traffic, typing)."
                selected={engine === "standard"}
                onSelect={() => setEngine("standard")}
                disabled={isBusy}
              />
              <EngineOption
                title="AI-Powered"
                badge="Best quality"
                description="Better at separating voice from complex background noise, closer to professional results. Requires downloading a one-time AI model first, and takes longer to process."
                selected={engine === "ai"}
                onSelect={() => setEngine("ai")}
                disabled={isBusy}
              />
            </div>
          </div>

          {isStandardBusy && (
            <div className="flex flex-col gap-3">
              {ffmpegOp.isLoadingCore && (
                <ProgressBar label="Loading converter…" percent={ffmpegOp.coreLoadProgress} />
              )}
              {ffmpegOp.isProcessing && (
                <ProgressBar label="Removing noise…" percent={ffmpegOp.processProgress} />
              )}
            </div>
          )}

          {isAIBusy && (
            <div className="flex flex-col gap-3">
              {aiOp.phase === "decoding" && (
                <div className="flex items-center gap-3 text-sm text-secondary">
                  <Spinner className="h-4 w-4" /> Reading audio…
                </div>
              )}
              {aiOp.phase === "downloading-model" && (
                <ProgressBar label="Downloading AI model (one-time only)…" percent={aiOp.downloadPercent} />
              )}
              {aiOp.phase === "enhancing" && (
                <div className="flex items-center gap-3 text-sm text-secondary">
                  <Spinner className="h-4 w-4" /> Removing noise with AI…
                </div>
              )}
            </div>
          )}

          {isBusy && (
            <Button type="button" variant="secondary" size="sm" onClick={handleCancel} className="self-start">
              Cancel
            </Button>
          )}

          <p className="text-xs text-secondary">
            Processing time may vary depending on your device and file size.
          </p>

          <Button onClick={handleProcess} disabled={!engine || isBusy} className="self-start">
            {isBusy && <Spinner className="h-4 w-4" />}
            {isBusy ? "Working…" : "Remove background noise"}
          </Button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      {result && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-card-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{result.name}</p>
            <p className="text-xs text-secondary">
              {formatBytes(result.bytes.length)} · {result.note}
            </p>
          </div>
          <Button onClick={() => downloadBytes(result.bytes, result.name, result.mime)}>Download</Button>
        </div>
      )}
    </div>
  );
}

function EngineOption({
  title,
  badge,
  description,
  selected,
  onSelect,
  disabled,
}: {
  title: string;
  badge: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        selected
          ? "border-accent bg-accent/5"
          : "border-card-border bg-bg hover:border-accent/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span
            aria-hidden
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
              selected ? "border-accent" : "border-card-border"
            }`}
          >
            {selected && <span className="h-2 w-2 rounded-full bg-accent" />}
          </span>
          {title}
        </span>
        <span className="rounded-full border border-card-border px-2 py-0.5 text-[11px] font-medium text-secondary">
          {badge}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-secondary">{description}</p>
    </button>
  );
}

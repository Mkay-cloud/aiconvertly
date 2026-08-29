import Link from "next/link";
import type { Tool } from "@/lib/tools";
import {
  AudioConverterIcon,
  CompressVideoIcon,
  EnhanceImageIcon,
  EnhanceVideoIcon,
  HeicToJpgIcon,
  ImageCompressorIcon,
  ImageResizerIcon,
  JpgToPdfIcon,
  MergeAudioIcon,
  MergeIcon,
  MergeVideosIcon,
  Mp4ToMp3Icon,
  PdfToJpgIcon,
  RemoveAudioIcon,
  RemoveExifIcon,
  RemoveNoiseIcon,
  RotateIcon,
  SplitIcon,
  SwapFormatIcon,
  TrimIcon,
  UniversalConverterIcon,
  VideoConverterIcon,
  VideoResolutionIcon,
  VideoSpeedIcon,
  VideoToGifIcon,
  WebpToPngIcon,
} from "./ToolIcons";

const icons: Record<string, (props: { className?: string }) => React.ReactNode> = {
  "merge-pdf": MergeIcon,
  "split-pdf": SplitIcon,
  "rotate-pdf": RotateIcon,
  "pdf-to-jpg": PdfToJpgIcon,
  "jpg-to-pdf": JpgToPdfIcon,
  "heic-to-jpg": HeicToJpgIcon,
  "webp-to-png": WebpToPngIcon,
  "jpg-png-converter": SwapFormatIcon,
  "image-converter": UniversalConverterIcon,
  "image-resizer": ImageResizerIcon,
  "image-compressor": ImageCompressorIcon,
  "remove-exif-data": RemoveExifIcon,
  "enhance-image-quality": EnhanceImageIcon,
  "mp4-to-mp3": Mp4ToMp3Icon,
  "video-converter": VideoConverterIcon,
  "audio-converter": AudioConverterIcon,
  "video-to-gif": VideoToGifIcon,
  "trim-video-audio": TrimIcon,
  "compress-video": CompressVideoIcon,
  "remove-audio-from-video": RemoveAudioIcon,
  "merge-videos": MergeVideosIcon,
  "change-video-speed": VideoSpeedIcon,
  "merge-audio": MergeAudioIcon,
  "video-resolution-converter": VideoResolutionIcon,
  "enhance-video-quality": EnhanceVideoIcon,
  "remove-background-noise": RemoveNoiseIcon,
};

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = icons[tool.slug];

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-card-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-accent/40"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/0 blur-3xl transition-colors duration-300 group-hover:bg-accent/10"
        aria-hidden
      />
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
        {Icon ? <Icon className="h-5 w-5" /> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-display text-lg font-semibold text-foreground">
          {tool.name}
        </h3>
        <p className="text-sm leading-relaxed text-secondary">
          {tool.shortDescription}
        </p>
      </div>
      <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent">
        Try it
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          &rarr;
        </span>
      </span>
    </Link>
  );
}

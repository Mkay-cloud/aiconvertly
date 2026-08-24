export type Tool = {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  metaDescription: string;
};

export const tools: Tool[] = [
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    shortDescription: "Combine multiple PDFs into a single file, in any order.",
    description:
      "Combine multiple PDF files into one document. Drag to reorder, then merge — everything happens in your browser.",
    metaDescription:
      "Merge multiple PDF files into one document for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    shortDescription: "Pull out page ranges or break a PDF into single pages.",
    description:
      "Extract a page range or split every page of a PDF into its own file — no uploads, all in your browser.",
    metaDescription:
      "Split a PDF into separate files or extract specific page ranges for free. Runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "rotate-pdf",
    name: "Rotate PDF",
    shortDescription: "Fix sideways or upside-down pages in seconds.",
    description:
      "Rotate all or selected pages in a PDF by 90, 180, or 270 degrees — processed locally in your browser.",
    metaDescription:
      "Rotate PDF pages 90, 180, or 270 degrees for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "pdf-to-jpg",
    name: "PDF to JPG",
    shortDescription: "Turn every page of a PDF into a downloadable image.",
    description:
      "Convert each page of a PDF into a high-quality JPG image, ready to download individually or all at once.",
    metaDescription:
      "Convert PDF pages to JPG images for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "jpg-to-pdf",
    name: "JPG to PDF",
    shortDescription: "Combine images into a single, shareable PDF.",
    description:
      "Combine one or more JPG or PNG images into a single PDF document — reorder pages before you export.",
    metaDescription:
      "Convert JPG or PNG images to PDF for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "heic-to-jpg",
    name: "HEIC to JPG",
    shortDescription: "Convert iPhone photos to JPG that opens everywhere.",
    description:
      "Convert HEIC and HEIF photos from your iPhone into standard JPG images — decoded and re-encoded entirely in your browser.",
    metaDescription:
      "Convert HEIC or HEIF iPhone photos to JPG for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "webp-to-png",
    name: "WebP to PNG",
    shortDescription: "Turn WebP images into widely-supported PNG files.",
    description:
      "Convert WebP images to PNG, preserving transparency, entirely in your browser — no uploads required.",
    metaDescription:
      "Convert WebP images to PNG for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "jpg-png-converter",
    name: "JPG ⇄ PNG Converter",
    shortDescription: "Convert JPG to PNG or PNG to JPG with one toggle.",
    description:
      "Convert between JPG and PNG in either direction — pick your direction, drop your images, and download the result.",
    metaDescription:
      "Convert JPG to PNG or PNG to JPG for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "image-converter",
    name: "Universal Image Converter",
    shortDescription: "Convert between JPG, PNG, WebP, GIF, BMP, AVIF, and TIFF.",
    description:
      "Convert an image to almost any format — JPG, PNG, WebP, GIF, BMP, AVIF, or TIFF — entirely in your browser.",
    metaDescription:
      "Convert images between JPG, PNG, WebP, GIF, BMP, AVIF, and TIFF for free. Runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "image-resizer",
    name: "Image Resizer",
    shortDescription: "Resize photos by exact pixels or by percentage.",
    description:
      "Resize an image to exact pixel dimensions or scale it by percentage, with the option to lock the aspect ratio.",
    metaDescription:
      "Resize images by pixels or percentage for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "image-compressor",
    name: "Image Compressor",
    shortDescription: "Shrink file size while keeping reasonable quality.",
    description:
      "Compress a photo to a smaller file size with an adjustable quality slider — see the size saved before you download.",
    metaDescription:
      "Compress images to reduce file size for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "remove-exif-data",
    name: "Remove EXIF & Location Data",
    shortDescription: "Strip hidden camera and GPS metadata before sharing.",
    description:
      "See what metadata — camera model, timestamp, GPS location — is hidden in your photos, then strip it out before you share them.",
    metaDescription:
      "Remove EXIF and GPS location metadata from photos for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "enhance-image-quality",
    name: "Enhance Image Quality",
    shortDescription: "Upscale and sharpen a photo 4x using an on-device AI model.",
    description:
      "Enhance a photo's quality with an AI super-resolution model — upscales 4x and restores fine detail, running entirely on your device.",
    metaDescription:
      "Enhance and upscale image quality 4x for free using AI, entirely in your browser. Fast, private — no uploads, no sign-up.",
  },
  {
    slug: "mp4-to-mp3",
    name: "MP4 to MP3",
    shortDescription: "Extract the audio track from a video file.",
    description:
      "Extract the audio track from an MP4 (or other video) file and save it as an MP3 — processed entirely in your browser.",
    metaDescription:
      "Convert MP4 video to MP3 audio for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "video-converter",
    name: "Video Converter",
    shortDescription: "Convert between MP4, WebM, and MOV.",
    description:
      "Convert a video between MP4, WebM, and MOV formats — encoded entirely on your device.",
    metaDescription:
      "Convert video files between MP4, WebM, and MOV for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "audio-converter",
    name: "Audio Converter",
    shortDescription: "Convert between MP3, WAV, and OGG.",
    description:
      "Convert an audio file between MP3, WAV, and OGG formats — encoded entirely on your device.",
    metaDescription:
      "Convert audio files between MP3, WAV, and OGG for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "video-to-gif",
    name: "Video to GIF",
    shortDescription: "Turn a video clip into an animated GIF.",
    description:
      "Convert a short video clip into an animated GIF, with control over the start time and duration.",
    metaDescription:
      "Convert video to an animated GIF for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "trim-video-audio",
    name: "Trim Video/Audio",
    shortDescription: "Cut a video or audio file to a start and end time.",
    description:
      "Trim a video or audio file down to the exact start and end time you need — no re-uploading, no watermark.",
    metaDescription:
      "Trim or cut video and audio files for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "compress-video",
    name: "Compress Video",
    shortDescription: "Shrink a video's file size while keeping quality reasonable.",
    description:
      "Compress a video to a smaller file size with an adjustable quality setting, encoded entirely in your browser.",
    metaDescription:
      "Compress video files to reduce size for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "remove-audio-from-video",
    name: "Remove Audio from Video",
    shortDescription: "Mute a video, keeping only the picture.",
    description:
      "Strip the audio track from a video, keeping the picture untouched — processed entirely on your device.",
    metaDescription:
      "Remove audio from a video for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "merge-videos",
    name: "Merge Videos",
    shortDescription: "Combine multiple video clips into one, in order.",
    description:
      "Combine multiple video clips into a single video, in the order you choose — clips can be different formats or resolutions.",
    metaDescription:
      "Merge multiple video files into one for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "change-video-speed",
    name: "Change Video Speed",
    shortDescription: "Slow down or speed up a video, audio included.",
    description:
      "Speed up or slow down a video from 0.5x to 2x, with audio pitch adjusted to match — processed entirely in your browser.",
    metaDescription:
      "Speed up or slow down video files for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "merge-audio",
    name: "Merge Audio Files",
    shortDescription: "Combine multiple audio clips into one, in order.",
    description:
      "Combine multiple audio clips into a single file, in the order you choose — clips can be different formats or sample rates.",
    metaDescription:
      "Merge multiple audio files into one for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "video-resolution-converter",
    name: "Video Resolution Converter",
    shortDescription: "Convert a video to 480p, 720p, or 1080p.",
    description:
      "Resize a video to a common resolution — 480p, 720p, or 1080p — while keeping its aspect ratio, entirely in your browser.",
    metaDescription:
      "Convert video resolution to 480p, 720p, or 1080p for free. Fast, private, and runs entirely in your browser — no uploads, no sign-up.",
  },
  {
    slug: "enhance-video-quality",
    name: "Enhance Video Quality",
    shortDescription: "Upscale every frame of a short clip 4x using an on-device AI model.",
    description:
      "Enhance a short video clip with an AI super-resolution model — every frame is upscaled 4x and sharpened, with the original audio preserved, entirely on your device.",
    metaDescription:
      "Enhance and upscale video quality 4x for free using AI, entirely in your browser. Fast, private — no uploads, no sign-up.",
  },
  {
    slug: "remove-background-noise",
    name: "Remove Background Noise from Audio",
    shortDescription: "Clean up hum, fan noise, or voices from an audio clip.",
    description:
      "Remove background noise from an audio file — pick a fast filter-based Standard engine for steady hum and hiss, or an AI-Powered engine that better separates voice from complex noise, entirely in your browser.",
    metaDescription:
      "Remove background noise from audio for free — choose a fast standard filter or an AI-powered voice-isolating engine. Runs entirely in your browser, no uploads, no sign-up.",
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}

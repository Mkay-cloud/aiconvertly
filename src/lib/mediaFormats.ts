export type VideoFormatId = "mp4" | "webm" | "mov";
export type AudioFormatId = "mp3" | "wav" | "ogg";

export type MediaFormat = {
  id: string;
  label: string;
  extension: string;
  mime: string;
};

export const videoFormats: Record<VideoFormatId, MediaFormat> = {
  mp4: { id: "mp4", label: "MP4", extension: "mp4", mime: "video/mp4" },
  webm: { id: "webm", label: "WebM", extension: "webm", mime: "video/webm" },
  mov: { id: "mov", label: "MOV", extension: "mov", mime: "video/quicktime" },
};

export const audioFormats: Record<AudioFormatId, MediaFormat> = {
  mp3: { id: "mp3", label: "MP3", extension: "mp3", mime: "audio/mpeg" },
  wav: { id: "wav", label: "WAV", extension: "wav", mime: "audio/wav" },
  ogg: { id: "ogg", label: "OGG", extension: "ogg", mime: "audio/ogg" },
};

export const videoFormatList = Object.values(videoFormats);
export const audioFormatList = Object.values(audioFormats);

/** ffmpeg output codec args for converting *to* each video format. */
export function videoEncodeArgs(format: VideoFormatId): string[] {
  switch (format) {
    case "mp4":
      return ["-c:v", "libx264", "-preset", "fast", "-c:a", "aac"];
    case "webm":
      // libvpx-vp9 reproducibly crashes this ffmpeg-core.wasm build with a
      // hard WASM out-of-bounds trap -- even the fastest/cheapest
      // "-deadline realtime -cpu-used 8" settings didn't avoid it, so
      // libvpx (VP8) is used instead (proven stable in this build).
      // Separately, decoding a real AAC audio stream and re-encoding it to
      // Opus *also* reproducibly crashes this build (isolated and
      // confirmed: AAC->Opus alone crashes; AAC->Vorbis on the exact same
      // input does not) -- libvorbis is used instead, still a fully valid,
      // native WebM audio codec.
      return ["-c:v", "libvpx", "-b:v", "0", "-crf", "32", "-c:a", "libvorbis", "-q:a", "4"];
    case "mov":
      return ["-c:v", "libx264", "-preset", "fast", "-c:a", "aac"];
  }
}

/** ffmpeg output codec args for converting *to* each audio format. */
export function audioEncodeArgs(format: AudioFormatId): string[] {
  switch (format) {
    case "mp3":
      return ["-c:a", "libmp3lame", "-q:a", "2"];
    case "wav":
      return ["-c:a", "pcm_s16le"];
    case "ogg":
      return ["-c:a", "libvorbis", "-q:a", "4"];
  }
}

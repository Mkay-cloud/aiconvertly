import type { FFmpeg } from "@ffmpeg/ffmpeg";

export async function writeInputFile(
  ffmpeg: FFmpeg,
  name: string,
  file: File
): Promise<void> {
  const data = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile(name, data);
}

export async function readOutputFile(ffmpeg: FFmpeg, name: string): Promise<Uint8Array> {
  const data = await ffmpeg.readFile(name);
  return data as Uint8Array;
}

export function inputFileName(file: File, fallbackExt: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  const ext = match ? match[1].toLowerCase() : fallbackExt;
  return `input.${ext}`;
}

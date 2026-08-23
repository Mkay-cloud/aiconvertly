import { GTCRN_SAMPLE_RATE } from "./gtcrnStft";

/**
 * Decodes an audio file to mono PCM at GTCRN's required 16kHz sample rate,
 * using the browser's own decoder and resampler (AudioContext.decodeAudioData
 * for format decoding, OfflineAudioContext's constructor sample rate for
 * resampling, and the Web Audio API's standard channel down-mix when the
 * destination has fewer channels than the source) rather than a hand-rolled
 * decoder/resampler -- both are exactly what they're built for, and using
 * them avoids reproducing (and re-verifying) that logic.
 */
export async function decodeTo16kMono(file: File): Promise<Float32Array> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const decodeCtx = new AudioContextCtor();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  } finally {
    decodeCtx.close();
  }

  const frameCount = Math.max(1, Math.ceil(decoded.duration * GTCRN_SAMPLE_RATE));
  const offlineCtx = new OfflineAudioContext(1, frameCount, GTCRN_SAMPLE_RATE);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

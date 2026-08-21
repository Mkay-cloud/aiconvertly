declare module "gifenc" {
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: Record<string, unknown>
  ): number[][];

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    format?: string
  ): Uint8Array;

  export type GIFEncoderInstance = {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: Record<string, unknown>
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  };

  export function GIFEncoder(options?: Record<string, unknown>): GIFEncoderInstance;
}

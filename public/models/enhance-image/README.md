# realesr-general-x4v3.onnx

4x image super-resolution model (SRVGGNetCompact, aka "Real-ESRGAN general
v3"), used by the Enhance Image Quality tool.

## Source and license

- Original weights: `realesr-general-x4v3.pth` from
  [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN), release
  `v0.2.5.0`.
- License: **BSD-3-Clause** (`xinntao/Real-ESRGAN`'s `LICENSE`), Copyright
  (c) 2021 Xintao Wang. Permissive, no "non-commercial" or "free to try"
  restriction — genuinely free to use, modify, and redistribute provided
  the copyright notice and license terms are retained (which this file
  does).
- The compact model (not the larger `RealESRGAN_x4plus.pth`) was chosen
  specifically for browser deployment: ~4.7MB of weights vs ~64MB, and a
  shallower network (32 body convolutions vs 23 residual-in-residual dense
  blocks) that's dramatically cheaper to run in WASM/WebGPU.

## Conversion to ONNX

This repository does not vendor a copy of PyTorch to do the conversion (the
only `torch` build resolvable from PyPI in this environment pulls in
~2GB of CUDA dependencies neither needed nor wanted for a one-time,
CPU-only, offline weight export). Instead the `.pth` checkpoint was parsed
directly with a small torch-free loader, and the ONNX graph was built by
hand with the `onnx` Python package, mirroring the architecture in
`realesrgan/archs/srvgg_arch.py` (`SRVGGNetCompact`, `num_feat=64,
num_conv=32, upscale=4, act_type='prelu'`) exactly:

- `Conv` nodes for each `body.N` convolution (weights loaded verbatim from
  the checkpoint).
- `PRelu` for each activation (per-channel slope reshaped to broadcast
  correctly against NCHW).
- `DepthToSpace(blocksize=4, mode="CRD")` for the final pixel-shuffle
  upsample -- `mode="CRD"` because PyTorch's `nn.PixelShuffle` does not
  match ONNX's default `DCR` ordering; this was verified bit-exact against
  a manual `nn.PixelShuffle` reimplementation before export.
- `Resize(mode="nearest", nearest_mode="floor",
  coordinate_transformation_mode="asymmetric")` for the residual
  nearest-neighbor upsample of the input -- verified bit-exact against
  `F.interpolate(mode='nearest')`.

Preprocessing/postprocessing (RGB, divide by 255, clamp output to `[0,1]`)
matches `realesrgan/utils.py`'s `RealESRGANer.enhance()` exactly.

Both op-level equivalences and the full graph's output were validated
against real images before this file was committed -- see the PR
description for the actual before/after results.

## Tiling

The tool splits large images into overlapping tiles before running them
through this model (`src/lib/enhanceImageTiling.ts`), using the same
algorithm as `RealESRGANer.tile_process` in the source repo. The padding
amount (40px) was chosen empirically: this model's receptive field is
exactly 34px (1 input conv + 32 body convs + 1 output conv, each a 3x3
conv contributing 1px), so 40px of padding on every tile reproduces a
byte-identical result to running the whole image through in one pass, not
just an imperceptibly-close approximation.

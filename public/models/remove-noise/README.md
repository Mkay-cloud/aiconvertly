# gtcrn.onnx

GTCRN (Grouped Temporal Convolutional Recurrent Network), a speech
enhancement / background-noise-suppression model, used by the AI-Powered
engine of the Remove Background Noise from Audio tool.

## Source and license

- Original code and pretrained weights:
  [Xiaobin-Rong/gtcrn](https://github.com/Xiaobin-Rong/gtcrn) (ICASSP 2024,
  "GTCRN: A Speech Enhancement Model Requiring Ultralow Computational
  Resources").
- License: **MIT** (`gtcrn`'s `LICENSE`), Copyright (c) 2024 Rong Xiaobin.
  Permissive, no "non-commercial" or "free to try" restriction.
- Checkpoint used: `checkpoints/model_trained_on_dns3.tar`, trained on the
  Deep Noise Suppression (DNS3) Challenge dataset -- chosen over the
  repo's other checkpoint (`model_trained_on_vctk.tar`, trained on
  VCTK-DEMAND) because DNS3 covers a much broader, more realistic variety
  of real-world noise types, matching this tool's general-purpose use case
  better than a single-corpus alternative.
- Actively maintained: commits as recent as August 2026. Independently
  adopted by other reputable projects (e.g. `k2-fsa/sherpa-onnx`,
  `sapphi-red/gtcrn-wasm`), and its own published benchmarks (PESQ / STOI /
  DNSMOS) show it outperforming RNNoise while being drastically lighter:
  48.2K parameters / 33.0 MMACs.

## Conversion to ONNX

Converted directly from the official PyTorch checkpoint with
`torch.onnx.export` (opset 18), loading `GTCRN()` from the upstream
`gtcrn.py` and its state dict from `model_trained_on_dns3.tar` unmodified
-- no re-training or fine-tuning.

Only the core `GTCRN` module is exported (STFT-domain spectrogram in,
STFT-domain spectrogram out: `(1, 257, T, 2)` real/imag-stacked, `T`
dynamic), exactly matching the input/output boundary of the upstream
`infer.py` reference script. STFT and ISTFT themselves are **not** part of
the graph -- `torch.istft` requires a genuine complex tensor
(`torch.view_as_complex`) on current PyTorch, and `aten::view_as_complex`
is not exportable at ONNX opset 18. Rather than fight that opset
limitation with a hand-rolled real-arithmetic ISTFT inside the graph, STFT
and ISTFT are implemented separately in TypeScript
(`src/lib/gtcrnStft.ts`) around the ONNX inference call: a 512-point
radix-2 FFT/IFFT (512 is a power of 2), sqrt-Hann window, 256-sample hop,
16kHz mono -- the exact same parameters `infer.py` uses
(`torch.stft(wav, 512, 256, 512, torch.hann_window(512).pow(0.5))`).

Both the ONNX export and the TypeScript STFT/ISTFT were verified
numerically before being trusted, not assumed correct:

- The exported ONNX graph's output was compared against the original
  PyTorch model's output on the same random input (via onnxruntime vs.
  `torch.no_grad()` forward pass): max absolute difference `4.17e-6` on
  values with mean absolute magnitude `~4.4e-3`, and the model was also
  re-run on a different-length input to confirm the dynamic time axis
  works correctly.
- The TypeScript STFT/ISTFT implementation was compared against
  `torch.stft`/`torch.istft` on a real (non-silent) synthetic signal: max
  absolute error on the STFT coefficients themselves was `~5e-6`
  (consistent with float32-vs-float64 rounding, not an algorithmic
  discrepancy), and round-tripping through STFT -> ISTFT alone reproduces
  the original waveform to within `4e-15` (float64 numerical noise).

## Input requirements

The model expects 16kHz mono audio. The browser-side pipeline downmixes
and resamples any input to that rate before running STFT, and the
enhanced output is produced at 16kHz mono as well (matching how the model
was trained -- upsampling back to the original rate would not add real
information, so the tool is upfront in its UI that the AI-Powered engine's
output is 16kHz mono).

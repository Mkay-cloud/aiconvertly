/**
 * STFT/ISTFT matching the exact parameters GTCRN was trained and exported
 * with (see public/models/remove-noise/README.md): n_fft=512, hop=256,
 * sqrt-Hann window, 16kHz mono, center=True reflect-padding -- i.e.
 * bit-for-bit the same convention as
 * `torch.stft(wav, 512, 256, 512, torch.hann_window(512).pow(0.5))` /
 * `torch.istft(..., length=N)`.
 *
 * The ONNX graph itself only contains the STFT-domain model (see that same
 * README for why: `torch.istft` needs a genuine complex tensor, and
 * `aten::view_as_complex` isn't ONNX-opset-18-exportable), so STFT/ISTFT
 * are done here instead, around the ONNX inference call. This exact
 * algorithm (radix-2 FFT, reflect padding, overlap-add with window-energy
 * normalization) was verified numerically against `torch.stft`/`torch.istft`
 * on a real (non-silent) test signal before being trusted: max abs error on
 * the STFT coefficients ~5e-6 (float32-vs-float64 rounding, not an
 * algorithmic difference), and round-tripping through stft() -> istft()
 * alone reproduces the original waveform to within 4e-15.
 */

export const GTCRN_NFFT = 512;
export const GTCRN_HOP = 256;
export const GTCRN_FREQ_BINS = GTCRN_NFFT / 2 + 1; // 257
export const GTCRN_SAMPLE_RATE = 16000;

const HALF = GTCRN_NFFT / 2;

function sqrtHannWindow(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    w[i] = Math.sqrt(0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
  }
  return w;
}

const WINDOW = sqrtHannWindow(GTCRN_NFFT);

/**
 * In-place iterative radix-2 Cooley-Tukey FFT (or its inverse). `re`/`im`
 * must have a power-of-two length -- always called here with exactly
 * GTCRN_NFFT (512), so no runtime size check is needed.
 */
function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 1 : -1) * 2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    const half = len / 2;
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < half; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + half] * curRe - im[i + k + half] * curIm;
        const vIm = re[i + k + half] * curIm + im[i + k + half] * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + half] = uRe - vRe;
        im[i + k + half] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        const nextIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
        curIm = nextIm;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

/** torch/numpy 'reflect' padding: mirrors samples just inside each edge, excluding the edge sample itself. */
function reflectPad(x: Float32Array, padAmount: number): Float64Array {
  const n = x.length;
  const out = new Float64Array(n + 2 * padAmount);
  for (let i = 0; i < padAmount; i++) out[i] = x[padAmount - i];
  for (let i = 0; i < n; i++) out[padAmount + i] = x[i];
  for (let i = 0; i < padAmount; i++) out[padAmount + n + i] = x[n - 2 - i];
  return out;
}

export type Spectrogram = { real: Float32Array[]; imag: Float32Array[]; numFrames: number };

/**
 * Matches `torch.stft(x, 512, 256, 512, sqrt_hann, center=True,
 * return_complex=False)`: returns one { real, imag } pair of length
 * GTCRN_FREQ_BINS (257) per frame.
 */
export function gtcrnStft(samples: Float32Array): Spectrogram {
  const padded = reflectPad(samples, HALF);
  const numFrames = 1 + Math.floor((padded.length - GTCRN_NFFT) / GTCRN_HOP);
  const real: Float32Array[] = new Array(numFrames);
  const imag: Float32Array[] = new Array(numFrames);

  const re = new Float64Array(GTCRN_NFFT);
  const im = new Float64Array(GTCRN_NFFT);
  for (let t = 0; t < numFrames; t++) {
    const start = t * GTCRN_HOP;
    for (let i = 0; i < GTCRN_NFFT; i++) {
      re[i] = padded[start + i] * WINDOW[i];
      im[i] = 0;
    }
    fft(re, im, false);
    const frameRe = new Float32Array(GTCRN_FREQ_BINS);
    const frameIm = new Float32Array(GTCRN_FREQ_BINS);
    for (let f = 0; f < GTCRN_FREQ_BINS; f++) {
      frameRe[f] = re[f];
      frameIm[f] = im[f];
    }
    real[t] = frameRe;
    imag[t] = frameIm;
  }
  return { real, imag, numFrames };
}

/**
 * Matches `torch.istft(spec, 512, 256, 512, sqrt_hann, center=True,
 * length=outLength)`: overlap-add synthesis with window-energy
 * normalization, cropped to `outLength` samples starting right after the
 * center padding -- i.e. the same convention used to reconstruct an
 * output of exactly the original input's sample count.
 */
export function gtcrnIstft(real: Float32Array[], imag: Float32Array[], outLength: number): Float32Array {
  const numFrames = real.length;
  const bufLen = GTCRN_NFFT + GTCRN_HOP * (numFrames - 1);
  const buf = new Float64Array(bufLen);
  const norm = new Float64Array(bufLen);

  const re = new Float64Array(GTCRN_NFFT);
  const im = new Float64Array(GTCRN_NFFT);
  for (let t = 0; t < numFrames; t++) {
    for (let f = 0; f <= HALF; f++) {
      re[f] = real[t][f];
      im[f] = imag[t][f];
    }
    // Reconstruct the full NFFT spectrum from the one-sided F=257 bins via
    // Hermitian symmetry (conj mirror) -- the input was real-valued.
    for (let f = HALF + 1; f < GTCRN_NFFT; f++) {
      re[f] = real[t][GTCRN_NFFT - f];
      im[f] = -imag[t][GTCRN_NFFT - f];
    }
    fft(re, im, true);
    const start = t * GTCRN_HOP;
    for (let i = 0; i < GTCRN_NFFT; i++) {
      buf[start + i] += re[i] * WINDOW[i];
      norm[start + i] += WINDOW[i] * WINDOW[i];
    }
  }
  for (let i = 0; i < bufLen; i++) {
    buf[i] = norm[i] > 1e-11 ? buf[i] / norm[i] : 0;
  }
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    out[i] = buf[HALF + i] ?? 0;
  }
  return out;
}

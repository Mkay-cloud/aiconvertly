import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Cross-origin isolation is required for SharedArrayBuffer, which
        // the multi-threaded ffmpeg-core.wasm build needs (see
        // src/lib/ffmpegClient.ts) -- video/audio conversion is several
        // times faster with it. Safe to apply site-wide: every resource
        // this site loads is self-hosted (fonts via next/font, no remote
        // images, no analytics, no iframes).
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      {
        // Observed on the deployed preview: under COEP require-corp, the
        // ffmpeg.wasm worker script showed as "(blocked)" in the Network
        // tab even though it's same-origin -- Vercel's static-asset CDN
        // serving doesn't reliably mark these as embeddable without an
        // explicit CORP header, which is why both the multi-threaded and
        // single-threaded core loads were hanging indefinitely (the worker
        // that does the actual work never loaded). This explicitly marks
        // every asset under these paths (worker.js and the core/wasm files
        // for both the single- and multi-threaded builds) safe to embed
        // under any embedder policy. Always safe to add: CORP only ever
        // relaxes cross-origin embedding restrictions, never adds new ones.
        source: "/ffmpeg/:path*",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "cross-origin" }],
      },
      {
        source: "/ffmpeg-mt/:path*",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "cross-origin" }],
      },
    ];
  },
};

export default nextConfig;

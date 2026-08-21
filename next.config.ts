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
        // images, no analytics, no iframes), so nothing needs a
        // Cross-Origin-Resource-Policy header to keep loading under COEP.
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;

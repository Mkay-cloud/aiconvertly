import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permanent redirects for renamed blog post slugs -- these URLs were
  // already submitted to Bing via IndexNow and may have external
  // references, so the old path must keep resolving (via redirect, not a
  // 404) rather than just disappearing when a slug changes.
  async redirects() {
    return [
      {
        source: "/blog/how-video-conversion-works-mp4-webm-mov-explained",
        destination: "/blog/video-format-converter",
        permanent: true,
      },
      {
        source: "/blog/how-to-resize-a-photo-to-an-exact-kb-size",
        destination: "/blog/resize-image-kb",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

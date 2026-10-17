import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  // keep the dev badge away from the logo
  devIndicators: false,
  // the MangaDex catalog index is read from disk at runtime (lib/catalog.ts)
  outputFileTracingIncludes: { "/*": ["./lib/data/catalog.json"] },
};

export default nextConfig;

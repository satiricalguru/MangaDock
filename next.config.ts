import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  // keep the dev badge away from the logo
  devIndicators: false,
};

export default nextConfig;

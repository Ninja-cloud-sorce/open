import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in the user's home directory
  // otherwise makes Next.js misdetect it as the project root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Our sidebar's collapse control sits bottom-left; keep the dev indicator
  // from overlapping it and eating clicks.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;

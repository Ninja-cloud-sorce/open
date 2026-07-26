import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in the user's home directory
  // otherwise makes Next.js misdetect it as the project root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Both bottom corners are claimed by our own fixed UI (sidebar collapse
  // control bottom-left, inspiration-sources FAB bottom-right), so the dev
  // indicator goes top-right to avoid eating clicks meant for either.
  devIndicators: {
    position: "top-right",
  },
};

export default nextConfig;

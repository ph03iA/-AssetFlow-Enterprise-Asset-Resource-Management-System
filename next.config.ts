import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack scoped to this repository when parent folders contain lockfiles.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

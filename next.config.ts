import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Next 16 auto-detects the project root via Git, which fails on a
    // non-repo folder. When the folder lives on a synced/virtualized
    // filesystem (OneDrive), the detection fallback forces Turbopack to watch
    // a wider scope, slowing HMR. Pin the root to the current working
    // directory (where package.json / package-lock.json live) so Turbopack
    // only scans and watches the project itself.
    root: path.join(process.cwd()),
  },
};

export default nextConfig;
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // The project uses App Router (src/app/). The legacy src/pages/ directory has stub files
  // left over from Vite. We use webpack.resolve.alias to make sure they aren't treated
  // as real Next.js pages. Next.js coexists App Router + empty Pages Router fine.
};

export default nextConfig;


import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build self-contido p/ deploy (1 LXC + reverse proxy, CONVENTION §11):
  // gera `.next/standalone` com o server Node mínimo (sem node_modules inteiro).
  output: "standalone",
};

export default nextConfig;

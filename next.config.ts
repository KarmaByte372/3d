import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-cron", "bcryptjs"],
  async redirects() {
    return [{ source: "/kosullar", destination: "/kullanim-sartlari", permanent: true }];
  },
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },
};

export default nextConfig;

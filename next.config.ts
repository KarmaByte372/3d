import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-cron", "bcryptjs"],
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },
};

export default nextConfig;

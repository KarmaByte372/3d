import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-cron", "bcryptjs"],
  async redirects() {
    return [{ source: "/kosullar", destination: "/kullanim-sartlari", permanent: true }];
  },
  experimental: {
    // Model dosyası (en fazla 50 MB) + form alanları. İki sınır da gerekli: middleware olan sayfalarda
    // Next isteği varsayılan 10 MB'ta keser ve form "Unexpected end of form" hatasıyla yarım kalır.
    serverActions: { bodySizeLimit: "52mb" },
    middlewareClientMaxBodySize: "52mb",
  },
};

export default nextConfig;

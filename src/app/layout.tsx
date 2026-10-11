import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baskı3D — 3D baskı hizmetleri pazaryeri",
  description: "3D baskı ihtiyacınızı yazın, işletmelerden teklif alın.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}

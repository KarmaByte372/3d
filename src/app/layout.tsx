import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";

const sans = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin", "latin-ext"], variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-mono", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSettings();
  return {
    title: { default: `${siteName}: 3D baskı hizmetleri pazaryeri`, template: `%s · ${siteName}` },
    description: "Modelini yükle, 3D baskı işletmelerinden teklif al. Ödemen teslimata kadar güvencede.",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

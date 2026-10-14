import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="bg-plate relative grid min-h-screen place-items-center bg-ink-950 px-4 text-center text-white">
      <div>
        <div className="mb-10 flex justify-center"><Logo dark /></div>
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-filament-orange">Hata 404</p>
        <h1 className="mt-3 text-5xl font-bold">Bu katman basılmamış</h1>
        <p className="mx-auto mt-4 max-w-md text-ink-300">Aradığın sayfa bulunamadı. Taşınmış, silinmiş ya da hiç var olmamış olabilir.</p>
        <Link href="/" className="btn mt-8">Ana sayfaya dön</Link>
      </div>
    </div>
  );
}

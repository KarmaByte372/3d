"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <p className="eyebrow">Beklenmeyen hata</p>
        <h1 className="mt-2 text-3xl font-bold">Baskı yarıda kaldı</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-500">Bir şeyler ters gitti. Tekrar dene, sorun devam ederse bizimle iletişime geç.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn">Tekrar dene</button>
          <Link href="/" className="btn-secondary">Ana sayfa</Link>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Logo } from "./Logo";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Logo />
          <Link href="/" className="text-sm text-ink-500 hover:text-ink-900">← Ana sayfa</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="eyebrow">Yasal</p>
        <h1 className="mt-1 text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-ink-400">Son güncelleme: {updated}</p>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Bu metin bir taslaktır. Yayına almadan önce şirket bilgileriyle doldurulmalı ve bir hukukçuya kontrol ettirilmelidir.
        </div>
        <article className="card mt-6 space-y-4 p-6 text-sm leading-relaxed text-ink-700 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ink-900 [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </article>
      </main>
    </div>
  );
}

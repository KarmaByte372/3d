import Link from "next/link";
import { getSettings, type Settings } from "@/lib/settings";
import { Logo } from "./Logo";

const LINKS = [
  ["/kullanim-sartlari", "Kullanım Şartları"],
  ["/gizlilik", "Gizlilik Politikası"],
  ["/kvkk", "KVKK Aydınlatma Metni"],
] as const;

/** Boş şirket alanları yayında köşeli parantezle görünür ki eksik olduğu fark edilsin. */
export function val(v: string, label: string) {
  return v.trim() || `[${label}]`;
}

export async function LegalPage({
  title,
  updated,
  path,
  children,
}: {
  title: string;
  updated: string;
  path: string;
  children: (s: Settings) => React.ReactNode;
}) {
  const s = await getSettings();
  const missing = !s.companyAddress || !s.companyEmail || !s.companyMersis;
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Logo />
          <Link href="/" className="text-sm text-ink-500 hover:text-ink-900">← Ana sayfa</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <nav className="mb-6 flex flex-wrap gap-2">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className={`chip ${href === path ? "border-ink-900 bg-ink-900 text-white" : ""}`}>{label}</Link>
          ))}
        </nav>
        <p className="eyebrow">Yasal</p>
        <h1 className="mt-1 text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-ink-400">Son güncelleme: {updated}</p>
        {missing && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Şirket bilgileri eksik. Yönetim paneli → Ayarlar → Şirket bilgileri bölümünden doldurun. Metni yayından önce bir hukukçuya kontrol ettirin.
          </div>
        )}
        <article className="card mt-6 space-y-4 p-6 text-sm leading-relaxed text-ink-700 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ink-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          {children(s)}
        </article>
        <CompanyCard s={s} />
      </main>
    </div>
  );
}

function CompanyCard({ s }: { s: Settings }) {
  const rows: [string, string][] = [
    ["Unvan", s.companyTitle],
    ["Adres", s.companyAddress],
    ["Vergi dairesi / no", [s.companyTaxOffice, s.companyTaxNumber].filter(Boolean).join(" / ")],
    ["MERSİS no", s.companyMersis],
    ["E-posta", s.companyEmail],
    ["Telefon", s.companyPhone],
    ["KEP", s.companyKep],
  ];
  return (
    <div className="card mt-6 p-6 text-sm">
      <p className="label">Veri sorumlusu ve hizmet sağlayıcı</p>
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[160px_1fr]">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-400">{k}</dt>
            <dd className="text-ink-800">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

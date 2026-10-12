import Link from "next/link";
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconLayers,
  IconNozzle,
  IconQuote,
  IconShield,
  IconTruck,
  IconUpload,
} from "@/components/Icons";
import { Logo } from "@/components/Logo";
import { PrintScene } from "@/components/PrintScene";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatBps, formatTL, splitCommission } from "@/lib/money";
import { HOME_BY_ROLE } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const STEPS = [
  { icon: IconUpload, title: "Modelini yükle", text: "STL, OBJ, 3MF veya STEP dosyanı ekle; malzeme, renk ve adedi seç." },
  { icon: IconQuote, title: "Teklifleri karşılaştır", text: "Yakınındaki atölyeler fiyat ve teslim süresiyle teklif versin." },
  { icon: IconNozzle, title: "Baskı başlasın", text: "Teklifi kabul et. Ödemen, ürün eline ulaşana kadar emanette kalır." },
  { icon: IconTruck, title: "Teslim al, onayla", text: "Kargonu takip et, teslimi onayla. Sorun olursa ödemen iade edilir." },
];

const TECH = [
  { name: "FDM", desc: "Prototip, fonksiyonel parça, büyük hacim", tags: ["PLA", "PETG", "ABS", "ASA", "TPU"], color: "from-filament-orange" },
  { name: "SLA / Reçine", desc: "Yüksek detay, pürüzsüz yüzey, minyatür, diş", tags: ["Standart", "Tough", "Döküm", "Şeffaf"], color: "from-filament-pink" },
  { name: "SLS / MJF", desc: "Destek gerektirmeyen dayanıklı naylon parçalar", tags: ["PA12", "PA11", "TPU"], color: "from-filament-cyan" },
];

export default async function Home() {
  const [user, settings, businessCount, completedOrders] = await Promise.all([
    getCurrentUser(),
    getSettings(),
    prisma.user.count({ where: { role: "BUSINESS", status: "ACTIVE" } }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
  ]);
  const example = splitCommission(100000, settings.commissionBps);

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="bg-plate absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-filament-orange/20 blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-filament-cyan/15 blur-[120px]" />

        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <Logo dark />
          <nav className="flex items-center gap-2">
            <a href="#nasil" className="hidden px-3 py-2 text-sm text-ink-300 transition hover:text-white md:inline">Nasıl çalışır</a>
            <a href="#teknolojiler" className="hidden px-3 py-2 text-sm text-ink-300 transition hover:text-white md:inline">Teknolojiler</a>
            <a href="#isletmeler" className="hidden px-3 py-2 text-sm text-ink-300 transition hover:text-white md:inline">İşletmeler için</a>
            {user ? (
              <Link href={HOME_BY_ROLE[user.role]} className="btn">Panelim <IconArrowRight className="h-4 w-4" /></Link>
            ) : (
              <>
                <Link href="/giris" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-200 transition hover:bg-white/10 hover:text-white">Giriş</Link>
                <Link href="/kayit" className="btn">Kayıt ol</Link>
              </>
            )}
          </nav>
        </header>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-10 lg:grid-cols-[1.1fr_.9fr] lg:pb-28 lg:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-filament-lime" />
              3D baskı pazaryeri
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Fikrini yükle,
              <br />
              <span className="text-filament">katman katman</span>
              <br />
              gerçeğe dönüşsün.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-300">
              Türkiye&apos;nin dört bir yanındaki 3D baskı atölyelerinden dakikalar içinde teklif al. En uygun fiyatı seç,
              ödemen teslimata kadar güvencede kalsın.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/kayit?rol=musteri" className="btn px-6 py-3 text-base">
                Baskı yaptır <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/kayit?rol=isletme"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                Atölyeni ekle
              </Link>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {[
                [businessCount > 0 ? String(businessCount) : "Yeni", "aktif atölye"],
                [completedOrders > 0 ? String(completedOrders) : "0", "tamamlanan baskı"],
                ["Ücretsiz", "teklif almak"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-2xl font-bold">{v}</dd>
                  <dd className="text-xs text-ink-400">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex justify-center lg:justify-end">
            <PrintScene />
          </div>
        </div>
        <div className="filament-line" />
      </section>

      {/* MALZEME ŞERİDİ */}
      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 font-mono text-xs uppercase tracking-widest text-ink-400">
          {["PLA", "PETG", "ABS", "ASA", "TPU", "Naylon", "Reçine", "Karbon fiber", "PA12"].map((m) => (
            <span key={m} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gradient-to-br from-filament-orange to-filament-pink" />
              {m}
            </span>
          ))}
        </div>
      </section>

      {/* NASIL ÇALIŞIR */}
      <section id="nasil" className="mx-auto max-w-6xl px-4 py-20">
        <p className="eyebrow">Nasıl çalışır</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">Dosyadan elindeki parçaya dört adım</h2>
        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="card card-hover relative">
              <span className="absolute right-5 top-5 font-mono text-xs text-ink-300">0{i + 1}</span>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-filament-orange">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-ink-500">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* TEKNOLOJİLER */}
      <section id="teknolojiler" className="bg-plate-light border-y border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="eyebrow">Teknolojiler</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">Her iş için doğru yazıcı</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TECH.map((t) => (
              <div key={t.name} className="card card-hover overflow-hidden p-0">
                <div className={`bg-layers h-24 bg-gradient-to-br ${t.color} to-ink-900`} />
                <div className="p-5">
                  <h3 className="text-xl font-bold">{t.name}</h3>
                  <p className="mt-1 text-sm text-ink-500">{t.desc}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {t.tags.map((tag) => (
                      <span key={tag} className="chip">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GÜVENCE + İŞLETMELER */}
      <section id="isletmeler" className="mx-auto grid max-w-6xl gap-6 px-4 py-20 lg:grid-cols-2">
        <div className="card p-8">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <IconShield className="h-5 w-5" />
          </span>
          <h2 className="mt-5 text-2xl font-bold">Müşteriler için güvenli ödeme</h2>
          <ul className="mt-5 space-y-3 text-sm text-ink-600">
            {[
              "Teklif kabul edildiğinde ödeme emanete alınır, atölyeye hemen geçmez.",
              "Ürün eline ulaşıp onaylayınca ödeme serbest kalır.",
              "Sipariş iptal edilirse tutarın tamamı bakiyene iade edilir.",
              "Kartla veya havale/EFT ile bakiye yükleyebilirsin.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <IconCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-ink-900 p-8 text-white">
          <div className="bg-plate absolute inset-0" />
          <div className="relative">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-filament-orange">
              <IconCalendar className="h-5 w-5" />
            </span>
            <h2 className="mt-5 text-2xl font-bold">Atölyeler için: her çarşamba ödeme</h2>
            <p className="mt-3 text-sm text-ink-300">
              Teklif vermek ücretsiz. Sadece tamamlanan işten {formatBps(settings.commissionBps)} komisyon alınır.
              Kazancın her çarşamba IBAN&apos;ına gönderilir.
            </p>
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-sm">
              <div className="flex justify-between text-ink-300"><span>Sipariş tutarı</span><span>{formatTL(100000)}</span></div>
              <div className="mt-1 flex justify-between text-ink-400"><span>Komisyon ({formatBps(settings.commissionBps)})</span><span>−{formatTL(example.commission)}</span></div>
              <div className="my-3 h-px bg-white/10" />
              <div className="flex justify-between font-semibold"><span>Çarşamba hesabına</span><span className="text-filament-lime">{formatTL(example.earning)}</span></div>
            </div>
            <Link href="/kayit?rol=isletme" className="btn mt-6">
              Atölyeni ücretsiz ekle <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-filament-orange via-filament-pink to-violet-600 p-10 text-white sm:p-14">
          <div className="bg-layers absolute inset-0 opacity-60" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <IconLayers className="h-8 w-8 opacity-80" />
              <h2 className="mt-3 text-3xl font-bold">İlk baskın için teklif almaya başla</h2>
              <p className="mt-2 text-white/80">Kayıt ücretsiz, teklif almak ücretsiz.</p>
            </div>
            <Link href="/kayit?rol=musteri" className="btn-dark px-6 py-3 text-base">
              Hemen başla <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-400">
          <Logo />
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/kosullar" className="hover:text-ink-700">Kullanım koşulları</Link>
            <Link href="/kvkk" className="hover:text-ink-700">KVKK</Link>
            <span>© {new Date().getFullYear()} Baskı3D</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

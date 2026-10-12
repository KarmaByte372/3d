import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCheck, IconPin } from "@/components/Icons";
import { Logo } from "@/components/Logo";
import { Empty } from "@/components/Shell";
import { Stars } from "@/components/Stars";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function WorkshopProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, role: "BUSINESS", status: "ACTIVE" },
    include: { business: true },
  });
  if (!user?.business) notFound();
  const b = user.business;
  const [reviews, agg, completed] = await Promise.all([
    prisma.review.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { customer: { select: { name: true } }, order: { select: { request: { select: { material: true } } } } },
    }),
    prisma.review.aggregate({ where: { businessId: id }, _avg: { rating: true }, _count: true }),
    prisma.order.count({ where: { businessId: id, status: "COMPLETED" } }),
  ]);
  const avg = agg._avg.rating ?? 0;
  // Gizlilik: yorum yapanın yalnızca adı ve soyadının baş harfi gösterilir
  const shortName = (n: string) => {
    const [first, ...rest] = n.split(/\s+/);
    return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-plate relative bg-ink-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-5"><Logo dark /></div>
        <div className="mx-auto flex max-w-5xl flex-wrap items-end gap-6 px-4 pb-10 pt-6">
          <span className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-filament-orange to-filament-pink font-display text-2xl font-bold">
            {b.companyName.slice(0, 2).toLocaleUpperCase("tr-TR")}
          </span>
          <div className="flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">3D baskı atölyesi</p>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold">
              {b.companyName}
              {b.verified && (
                <span title="Doğrulanmış atölye" className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500"><IconCheck className="h-4 w-4" /></span>
              )}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-300"><IconPin className="h-4 w-4" /> {b.city} · Üyelik: {formatDate(b.createdAt)}</p>
          </div>
          <div className="flex gap-6 text-center">
            <div><p className="font-display text-3xl font-bold">{agg._count ? avg.toFixed(1) : "—"}</p><Stars value={avg} /><p className="text-xs text-ink-400">{agg._count} değerlendirme</p></div>
            <div><p className="font-display text-3xl font-bold">{completed}</p><p className="text-xs text-ink-400">tamamlanan iş</p></div>
          </div>
        </div>
        <div className="filament-line" />
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          {b.description && <div className="card text-sm text-ink-700"><p className="label">Hakkında</p><p className="whitespace-pre-wrap">{b.description}</p></div>}
          {[["Teknolojiler", b.technologies], ["Malzemeler", b.materials]].map(([t, v]) =>
            v ? (
              <div key={t} className="card">
                <p className="label">{t}</p>
                <div className="flex flex-wrap gap-1.5">{v.split(",").map((x) => x.trim()).filter(Boolean).map((x) => <span key={x} className="chip">{x}</span>)}</div>
              </div>
            ) : null,
          )}
          <Link href="/kayit?rol=musteri" className="btn w-full">Baskı talebi oluştur</Link>
        </aside>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Müşteri yorumları</h2>
          {reviews.length === 0 ? (
            <Empty icon="IconStar">Henüz değerlendirme yok.</Empty>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="card">
                  <div className="flex items-center justify-between gap-3">
                    <Stars value={r.rating} />
                    <span className="font-mono text-[11px] text-ink-400">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{r.comment}</p>}
                  <p className="mt-2 text-xs text-ink-400">{shortName(r.customer.name)} · {r.order.request.material}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

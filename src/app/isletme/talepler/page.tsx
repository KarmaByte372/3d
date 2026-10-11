import Link from "next/link";
import { IconCheck, IconFile, IconPin, IconSearch } from "@/components/Icons";
import { Empty, PageTitle } from "@/components/Shell";
import { MaterialDot } from "@/components/Spec";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatTL } from "@/lib/money";

export default async function OpenRequests({
  searchParams,
}: {
  searchParams: Promise<{ sehir?: string; malzeme?: string }>;
}) {
  const user = await requireUser("BUSINESS");
  const { sehir, malzeme } = await searchParams;
  const requests = await prisma.printRequest.findMany({
    where: {
      status: "OPEN",
      customerId: { not: user.id },
      ...(sehir ? { city: { contains: sehir } } : {}),
      ...(malzeme ? { material: { contains: malzeme } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { quotes: { where: { businessId: user.id }, select: { status: true } } },
  });

  return (
    <>
      <PageTitle eyebrow="İş fırsatları" description="Teklif vermek ücretsiz. Komisyon sadece tamamlanan işten alınır.">
        Açık talepler
      </PageTitle>
      <form className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[10rem] flex-1">
          <label className="label" htmlFor="sehir">Şehir</label>
          <input className="input" id="sehir" name="sehir" placeholder="Tümü" defaultValue={sehir} />
        </div>
        <div className="min-w-[10rem] flex-1">
          <label className="label" htmlFor="malzeme">Malzeme</label>
          <input className="input" id="malzeme" name="malzeme" placeholder="PLA, PETG, Reçine…" defaultValue={malzeme} />
        </div>
        <button className="btn-dark"><IconSearch className="h-4 w-4" /> Filtrele</button>
      </form>
      {requests.length === 0 ? (
        <Empty icon="IconSearch">Şu anda filtrelerine uyan açık talep yok.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((r) => (
            <Link key={r.id} href={`/isletme/talepler/${r.id}`} className="card card-hover group flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold group-hover:text-brand-600">{r.title}</h3>
                {r.quotes[0] ? (
                  <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700"><IconCheck className="h-3.5 w-3.5" /> Teklif verdin</span>
                ) : r.budget ? (
                  <span className="whitespace-nowrap font-display text-lg font-bold">{formatTL(r.budget)}</span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-ink-500">{r.description}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <span className="chip"><MaterialDot material={r.material} className="h-2.5 w-2.5" />{r.material}</span>
                <span className="chip font-mono">{r.quantity}×</span>
                <span className="chip"><IconPin className="h-3.5 w-3.5" />{r.city}</span>
                {r.fileName && <span className="chip"><IconFile className="h-3.5 w-3.5" />Model</span>}
                <span className="ml-auto font-mono text-[11px] text-ink-400">{formatDateTime(r.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

import Link from "next/link";
import { Badge } from "@/components/Badge";
import { IconPlus, IconQuote } from "@/components/Icons";
import { Empty, PageTitle } from "@/components/Shell";
import { MaterialDot } from "@/components/Spec";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";

export default async function CustomerHome() {
  const user = await requireUser("CUSTOMER");
  const requests = await prisma.printRequest.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { quotes: { where: { status: { not: "WITHDRAWN" } } } } } },
  });
  return (
    <>
      <PageTitle
        eyebrow="Müşteri paneli"
        description="Baskı taleplerin ve gelen teklifler"
        action={<Link href="/musteri/talep/yeni" className="btn"><IconPlus className="h-4 w-4" /> Yeni talep</Link>}
      >
        Taleplerim
      </PageTitle>
      {requests.length === 0 ? (
        <Empty icon="IconUpload">
          <p className="font-semibold text-ink-700">Henüz talebin yok</p>
          <p className="mt-1">Modelini yükle, atölyeler teklif versin.</p>
          <Link href="/musteri/talep/yeni" className="btn mt-4">İlk talebini oluştur</Link>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((r) => (
            <Link key={r.id} href={`/musteri/talep/${r.id}`} className="card card-hover group flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <Badge status={r.status} />
                <span className="font-mono text-[11px] text-ink-400">{formatDateTime(r.createdAt)}</span>
              </div>
              <h3 className="mt-3 line-clamp-2 text-lg font-semibold group-hover:text-brand-600">{r.title}</h3>
              <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm">
                <span className="flex items-center gap-2 text-ink-500">
                  <MaterialDot material={r.material} /> {r.material} · {r.quantity}×
                </span>
                <span className={`flex items-center gap-1.5 font-semibold ${r._count.quotes ? "text-brand-600" : "text-ink-400"}`}>
                  <IconQuote className="h-4 w-4" /> {r._count.quotes} teklif
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

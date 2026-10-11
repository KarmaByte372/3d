import Link from "next/link";
import { Empty, PageTitle } from "@/components/Shell";
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
      <PageTitle>Açık talepler</PageTitle>
      <form className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" name="sehir" placeholder="Şehir" defaultValue={sehir} />
        <input className="input max-w-xs" name="malzeme" placeholder="Malzeme" defaultValue={malzeme} />
        <button className="btn-secondary">Filtrele</button>
      </form>
      {requests.length === 0 ? (
        <Empty>Şu anda filtrelerine uyan açık talep yok.</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {requests.map((r) => (
            <Link key={r.id} href={`/isletme/talepler/${r.id}`} className="card block hover:border-brand-500">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{r.title}</p>
                {r.quotes[0] && <span className="text-xs text-green-700">Teklif verdin</span>}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">{r.description}</p>
              <p className="mt-2 text-xs text-gray-500">
                {r.city} · {r.material} · {r.quantity} adet{r.budget ? ` · bütçe ${formatTL(r.budget)}` : ""} · {formatDateTime(r.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

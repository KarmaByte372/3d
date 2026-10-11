import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Empty, PageTitle } from "@/components/Shell";
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
      <PageTitle action={<Link href="/musteri/talep/yeni" className="btn">+ Yeni talep</Link>}>Taleplerim</PageTitle>
      {requests.length === 0 ? (
        <Empty>
          Henüz talebin yok. <Link href="/musteri/talep/yeni" className="link">İlk talebini oluştur</Link>, işletmeler teklif versin.
        </Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Talep</th><th>Malzeme</th><th>Adet</th><th>Teklif</th><th>Durum</th><th>Tarih</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/musteri/talep/${r.id}`} className="link">{r.title}</Link></td>
                  <td>{r.material}</td>
                  <td>{r.quantity}</td>
                  <td>{r._count.quotes}</td>
                  <td><Badge status={r.status} /></td>
                  <td>{formatDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

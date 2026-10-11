import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { Empty, PageTitle } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatTL } from "@/lib/money";
import { withdrawQuoteAction } from "../actions";

export default async function MyQuotes() {
  const user = await requireUser("BUSINESS");
  const quotes = await prisma.quote.findMany({
    where: { businessId: user.id },
    orderBy: { createdAt: "desc" },
    include: { request: true },
    take: 200,
  });
  return (
    <>
      <PageTitle eyebrow="Atölye">Tekliflerim</PageTitle>
      {quotes.length === 0 ? (
        <Empty>Henüz teklif vermedin. <Link href="/isletme/talepler" className="link">Açık taleplere bak</Link>.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Talep</th><th>Fiyat</th><th>Teslim</th><th>Durum</th><th>Tarih</th><th></th></tr></thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td><Link href={`/isletme/talepler/${q.requestId}`} className="link">{q.request.title}</Link></td>
                  <td>{formatTL(q.price)}</td>
                  <td>{q.deliveryDays} gün</td>
                  <td><Badge status={q.status} /></td>
                  <td>{formatDateTime(q.createdAt)}</td>
                  <td>
                    {q.status === "PENDING" && (
                      <ActionForm action={withdrawQuoteAction} confirm="Teklif geri çekilsin mi?">
                        <input type="hidden" name="quoteId" value={q.id} />
                        <SubmitButton className="btn-secondary">Geri çek</SubmitButton>
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

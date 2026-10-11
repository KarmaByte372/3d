import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { Empty, PageTitle } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatTL } from "@/lib/money";
import { acceptQuoteAction, cancelRequestAction } from "../../actions";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("CUSTOMER");
  const request = await prisma.printRequest.findFirst({
    where: { id, customerId: user.id },
    include: {
      quotes: {
        where: { status: { not: "WITHDRAWN" } },
        orderBy: { price: "asc" },
        include: { business: { include: { business: true } } },
      },
    },
  });
  if (!request) notFound();

  return (
    <>
      <PageTitle action={<Badge status={request.status} />}>{request.title}</PageTitle>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-2 text-sm lg:col-span-1">
          <p className="whitespace-pre-wrap text-gray-700">{request.description}</p>
          <dl className="grid grid-cols-2 gap-y-1 pt-2">
            <dt className="text-gray-500">Teknoloji</dt><dd>{request.technology ?? "—"}</dd>
            <dt className="text-gray-500">Malzeme</dt><dd>{request.material}</dd>
            <dt className="text-gray-500">Renk</dt><dd>{request.color ?? "—"}</dd>
            <dt className="text-gray-500">Adet</dt><dd>{request.quantity}</dd>
            <dt className="text-gray-500">Şehir</dt><dd>{request.city}</dd>
            <dt className="text-gray-500">Bütçe</dt><dd>{request.budget ? formatTL(request.budget) : "—"}</dd>
            <dt className="text-gray-500">Son tarih</dt><dd>{formatDate(request.deadline)}</dd>
            <dt className="text-gray-500">Oluşturma</dt><dd>{formatDateTime(request.createdAt)}</dd>
          </dl>
          {request.fileName && (
            <a href={`/api/files/${request.id}`} className="link block pt-2">📎 {request.fileName}</a>
          )}
          {request.status === "OPEN" && (
            <ActionForm action={cancelRequestAction} confirm="Talep iptal edilsin mi?" className="pt-3">
              <input type="hidden" name="requestId" value={request.id} />
              <SubmitButton className="btn-secondary">Talebi iptal et</SubmitButton>
            </ActionForm>
          )}
        </div>

        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-lg font-semibold">Teklifler ({request.quotes.length})</h2>
          {request.quotes.length === 0 && <Empty>Henüz teklif gelmedi. İşletmeler talebini görüyor.</Empty>}
          {request.quotes.map((q) => (
            <div key={q.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {q.business.business?.companyName ?? q.business.name}
                    {q.business.business?.verified && <span className="ml-2 text-xs text-green-700">✓ Doğrulanmış</span>}
                  </p>
                  <p className="text-sm text-gray-500">
                    {q.business.business?.city} · {q.business.business?.technologies || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{formatTL(q.price)}</p>
                  <p className="text-sm text-gray-500">{q.deliveryDays} günde teslim</p>
                </div>
              </div>
              {q.message && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{q.message}</p>}
              <div className="mt-3 flex items-center justify-between">
                <Badge status={q.status} />
                {q.status === "PENDING" && request.status === "OPEN" && (
                  <ActionForm
                    action={acceptQuoteAction}
                    confirm={`${formatTL(q.price)} bakiyenizden düşülecek ve iş tamamlanana kadar güvencede tutulacak. Onaylıyor musunuz?`}
                  >
                    <input type="hidden" name="quoteId" value={q.id} />
                    <SubmitButton>Teklifi kabul et</SubmitButton>
                  </ActionForm>
                )}
              </div>
              {q.status === "PENDING" && request.status === "OPEN" && user.balance < q.price && (
                <p className="mt-2 text-sm text-amber-700">
                  Bakiyen yetersiz. <Link href="/musteri/bakiye" className="link">Bakiye yükle</Link>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

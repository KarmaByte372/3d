import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { PageTitle } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatBps, formatTL, splitCommission } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { submitQuoteAction } from "../../actions";

export default async function BusinessRequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("BUSINESS");
  const [request, settings] = await Promise.all([
    prisma.printRequest.findUnique({
      where: { id },
      include: {
        quotes: { where: { businessId: user.id } },
        _count: { select: { quotes: { where: { status: { in: ["PENDING", "ACCEPTED"] } } } } },
      },
    }),
    getSettings(),
  ]);
  if (!request || (request.status !== "OPEN" && !request.quotes.length)) notFound();
  const mine = request.quotes[0];
  const example = splitCommission(100000, settings.commissionBps);

  return (
    <>
      <PageTitle action={<Badge status={request.status} />}>{request.title}</PageTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-2 text-sm">
          <p className="whitespace-pre-wrap text-gray-700">{request.description}</p>
          <dl className="grid grid-cols-2 gap-y-1 pt-2">
            <dt className="text-gray-500">Teknoloji</dt><dd>{request.technology ?? "—"}</dd>
            <dt className="text-gray-500">Malzeme</dt><dd>{request.material}</dd>
            <dt className="text-gray-500">Renk</dt><dd>{request.color ?? "—"}</dd>
            <dt className="text-gray-500">Adet</dt><dd>{request.quantity}</dd>
            <dt className="text-gray-500">Şehir</dt><dd>{request.city}</dd>
            <dt className="text-gray-500">Bütçe</dt><dd>{request.budget ? formatTL(request.budget) : "—"}</dd>
            <dt className="text-gray-500">Son tarih</dt><dd>{formatDate(request.deadline)}</dd>
            <dt className="text-gray-500">Yayın</dt><dd>{formatDateTime(request.createdAt)}</dd>
            <dt className="text-gray-500">Teklif sayısı</dt><dd>{request._count.quotes} / {settings.maxQuotesPerRequest}</dd>
          </dl>
          {request.fileName && <a href={`/api/files/${request.id}`} className="link block pt-2">📎 {request.fileName}</a>}
        </div>

        <div className="card">
          <h2 className="mb-1 font-semibold">{mine && mine.status !== "WITHDRAWN" ? "Teklifin" : "Teklif ver"}</h2>
          <p className="mb-4 text-xs text-gray-500">
            Teklif vermek ücretsiz. İş tamamlanınca {formatBps(settings.commissionBps)} komisyon kesilir
            (ör. {formatTL(100000)} teklifte eline {formatTL(example.earning)} geçer).
          </p>
          {mine && <p className="mb-3 text-sm">Durum: <Badge status={mine.status} /></p>}
          {request.status === "OPEN" && (!mine || mine.status === "PENDING" || mine.status === "WITHDRAWN") && (
            <ActionForm action={submitQuoteAction} className="space-y-3">
              <input type="hidden" name="requestId" value={request.id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="price">Toplam fiyat (TL, KDV dahil)</label>
                  <input className="input" id="price" name="price" inputMode="decimal" required
                    defaultValue={mine && mine.status === "PENDING" ? (mine.price / 100).toFixed(2).replace(".", ",") : ""} />
                </div>
                <div>
                  <label className="label" htmlFor="deliveryDays">Teslim (gün)</label>
                  <input className="input" id="deliveryDays" name="deliveryDays" type="number" min={1} max={90} required
                    defaultValue={mine?.deliveryDays ?? 3} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="message">Mesaj</label>
                <textarea className="input min-h-24" id="message" name="message" defaultValue={mine?.message}
                  placeholder="Kullanacağın yazıcı, malzeme markası, kargo dahil mi…" />
              </div>
              <SubmitButton>{mine?.status === "PENDING" ? "Teklifi güncelle" : "Teklif gönder"}</SubmitButton>
            </ActionForm>
          )}
        </div>
      </div>
    </>
  );
}

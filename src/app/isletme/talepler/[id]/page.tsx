import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { PageTitle } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { SpecSheet } from "@/components/Spec";
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
      <PageTitle eyebrow={`Açık talep · ${formatDateTime(request.createdAt)}`} action={<Badge status={request.status} />}>
        {request.title}
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr] [&>*]:min-w-0">
        <div className="space-y-3">
          <SpecSheet request={request} />
          <p className="chip w-full justify-center font-mono">
            {request._count.quotes} / {settings.maxQuotesPerRequest} teklif verildi
          </p>
        </div>

        <div className="card h-fit p-6">
          <p className="eyebrow mb-1">Teklifin</p>
          <h2 className="mb-1 text-xl font-semibold">{mine && mine.status !== "WITHDRAWN" ? "Teklifin" : "Teklif ver"}</h2>
          <p className="mb-5 rounded-xl bg-ink-50 p-3 text-xs text-ink-500">
            Teklif vermek ücretsiz. İş tamamlanınca {formatBps(settings.commissionBps)} komisyon kesilir
            (ör. {formatTL(100000)} teklifte eline {formatTL(example.earning)} geçer).
          </p>
          {mine && <p className="mb-3 text-sm">Durum: <Badge status={mine.status} /></p>}
          {user.identityStatus !== "VERIFIED" && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Kimlik bilgilerin yönetici tarafından onaylandıktan sonra teklif verebilirsin.
            </p>
          )}
          {user.identityStatus === "VERIFIED" && request.status === "OPEN" && (!mine || mine.status === "PENDING" || mine.status === "WITHDRAWN") && (
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

import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { PageTitle } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { SpecSheet } from "@/components/Spec";
import Link from "next/link";
import { quoteFeeFor } from "@/lib/marketplace";
import { formatBps, formatTL } from "@/lib/money";
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
  const fee = await quoteFeeFor(user.id, request);
  const isNew = !mine || mine.status === "WITHDRAWN";
  const total = user.balance + user.credit;

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
          {isNew && request.status === "OPEN" && (
            <div className="mb-5 rounded-xl border border-ink-100 bg-ink-50 p-4 text-sm">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="font-semibold">Teklif ücreti</span>
                <strong className="font-display text-xl">{fee.amount > 0 ? formatTL(fee.amount) : "Ücretsiz"}</strong>
              </div>
              {fee.amount > 0 && (
                <ul className="space-y-1 text-xs text-ink-500">
                  {fee.lines.map((l) => (
                    <li key={l.label} className="flex justify-between gap-3"><span>{l.label}</span><span className="font-mono">{l.value}</span></li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-ink-500">
                Ücret teklif gönderilince alınır ve iade edilmez; işi alırsan tutarın tamamı senindir
                {settings.commissionBps > 0 ? ` (tamamlanan işten ${formatBps(settings.commissionBps)} komisyon)` : " (komisyon yok)"}.
                Çok sayıda 5 yıldız aldıkça ücretin düşer.
              </p>
            </div>
          )}
          {!isNew && <p className="mb-5 rounded-xl bg-ink-50 p-3 text-xs text-ink-500">Bekleyen teklifini güncellemek ücretsizdir.</p>}
          {mine && <p className="mb-3 text-sm">Durum: <Badge status={mine.status} /></p>}
          {settings.identityRequired === "true" && user.identityStatus !== "VERIFIED" && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Kimlik bilgilerin yönetici tarafından onaylandıktan sonra teklif verebilirsin.
            </p>
          )}
          {(settings.identityRequired !== "true" || user.identityStatus === "VERIFIED") && request.status === "OPEN" && (!mine || mine.status === "PENDING" || mine.status === "WITHDRAWN") && (
            <ActionForm action={submitQuoteAction} className="space-y-3"
              confirm={isNew && fee.amount > 0 ? `${formatTL(fee.amount)} teklif ücreti alınacak ve iade edilmez. Teklif gönderilsin mi?` : undefined}>
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="isNew" value={isNew ? "1" : "0"} />
              {isNew && <input type="hidden" name="expectedFee" value={fee.amount} />}
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
              {isNew && fee.amount > 0 && (
                <fieldset className="space-y-2 rounded-xl border border-ink-100 p-3">
                  <legend className="px-1 text-xs font-semibold text-ink-600">Ücret nereden ödensin?</legend>
                  {[
                    { v: "AUTO", t: "Önce kazancımdan, yetmezse bakiyemden", ok: total >= fee.amount },
                    { v: "EARNINGS", t: `Kazancımdan (${formatTL(user.balance)})`, ok: user.balance >= fee.amount },
                    { v: "CREDIT", t: `Bakiyemden (${formatTL(user.credit)})`, ok: user.credit >= fee.amount },
                  ].map((o) => (
                    <label key={o.v} className={`flex items-center gap-2 text-sm ${o.ok ? "" : "text-ink-400"}`}>
                      <input type="radio" name="feeSource" value={o.v} defaultChecked={o.v === "AUTO"} disabled={!o.ok} className="accent-brand-500" />
                      {o.t}
                    </label>
                  ))}
                  {total < fee.amount && (
                    <p className="text-xs text-red-600">
                      Kazanç ve bakiyen yetersiz. <Link href="/isletme/bakiye" className="link">Bakiye yükle →</Link>
                    </p>
                  )}
                </fieldset>
              )}
              <SubmitButton>{!isNew ? "Teklifi güncelle" : fee.amount > 0 ? `Teklif gönder · ${formatTL(fee.amount)}` : "Teklif gönder"}</SubmitButton>
            </ActionForm>
          )}
        </div>
      </div>
    </>
  );
}

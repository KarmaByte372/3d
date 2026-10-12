import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { IconCheck, IconClock, IconPin } from "@/components/Icons";
import { Empty, PageTitle } from "@/components/Shell";
import { SpecSheet } from "@/components/Spec";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatTL } from "@/lib/money";
import { acceptQuoteAction, cancelRequestAction } from "../../actions";
import { ratingsFor } from "@/lib/marketplace";
import { RatingInline } from "@/components/Stars";

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
  const ratings = await ratingsFor(request.quotes.map((q) => q.businessId));
  const open = request.status === "OPEN";
  const cheapest = request.quotes.find((q) => q.status === "PENDING")?.id;

  return (
    <>
      <PageTitle
        eyebrow={`Talep · ${formatDateTime(request.createdAt)}`}
        action={<Badge status={request.status} />}
      >
        {request.title}
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          <SpecSheet request={request} />
          {open && (
            <ActionForm action={cancelRequestAction} confirm="Talep iptal edilsin mi?">
              <input type="hidden" name="requestId" value={request.id} />
              <SubmitButton className="btn-secondary w-full">Talebi iptal et</SubmitButton>
            </ActionForm>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Teklifler</h2>
            <span className="chip font-mono">{request.quotes.length} teklif</span>
          </div>
          {request.quotes.length === 0 && (
            <Empty icon="IconNozzle">
              <p className="font-semibold text-ink-700">Teklifler bekleniyor</p>
              <p className="mt-1">Atölyeler talebini görüyor. Teklif geldikçe burada listelenecek.</p>
            </Empty>
          )}
          {request.quotes.map((q) => {
            const b = q.business.business;
            const name = b?.companyName ?? q.business.name;
            const best = q.id === cheapest && request.quotes.length > 1 && open;
            return (
              <div key={q.id} className={`card relative ${best ? "ring-2 ring-brand-400" : ""}`}>
                {best && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-gradient-to-r from-filament-orange to-filament-pink px-2.5 py-0.5 text-[11px] font-bold text-white">
                    En uygun fiyat
                  </span>
                )}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-900 font-display text-sm font-bold text-white">
                      {name.slice(0, 2).toLocaleUpperCase("tr-TR")}
                    </span>
                    <div>
                      <p className="flex items-center gap-1.5 font-semibold">
                        <Link href={`/atolye/${q.businessId}`} className="hover:text-brand-600" target="_blank">{name}</Link>
                        {b?.verified && (
                          <span title="Doğrulanmış atölye" className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white">
                            <IconCheck className="h-3 w-3" />
                          </span>
                        )}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-ink-500">
                        <IconPin className="h-3.5 w-3.5" /> {b?.city} {b?.technologies && <>· {b.technologies}</>}
                      </p>
                      <RatingInline rating={ratings.get(q.businessId)} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold">{formatTL(q.price)}</p>
                    <p className="flex items-center justify-end gap-1 text-xs text-ink-500">
                      <IconClock className="h-3.5 w-3.5" /> {q.deliveryDays} günde teslim
                    </p>
                  </div>
                </div>
                {q.message && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-ink-50 p-3 text-sm text-ink-700">{q.message}</p>}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Badge status={q.status} />
                  {q.status === "PENDING" && open && (
                    <ActionForm
                      action={acceptQuoteAction}
                      confirm={`${formatTL(q.price)} bakiyenizden düşülecek ve iş tamamlanana kadar güvencede tutulacak. Onaylıyor musunuz?`}
                    >
                      <input type="hidden" name="quoteId" value={q.id} />
                      <SubmitButton>Teklifi kabul et</SubmitButton>
                    </ActionForm>
                  )}
                </div>
                {q.status === "PENDING" && open && user.balance < q.price && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Bakiyen yetersiz. <Link href="/musteri/bakiye" className="link">Bakiye yükle</Link>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

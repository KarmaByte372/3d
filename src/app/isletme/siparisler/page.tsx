import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { OrderProgress } from "@/components/OrderProgress";
import { Empty, PageTitle } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatBps, formatTL } from "@/lib/money";
import { cancelOrderAction, markShippedAction } from "../actions";

export default async function BusinessOrders() {
  const user = await requireUser("BUSINESS");
  const orders = await prisma.order.findMany({
    where: { businessId: user.id },
    orderBy: { createdAt: "desc" },
    include: { request: true, customer: true },
  });
  return (
    <>
      <PageTitle eyebrow="Atölye">Siparişler</PageTitle>
      {orders.length === 0 && <Empty>Henüz sipariş yok. Teklifin kabul edildiğinde burada görünür.</Empty>}
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/isletme/siparisler/${o.id}`} className="text-lg font-semibold hover:text-brand-600">{o.request.title} →</Link>
                <p className="text-sm text-ink-500">
                  {o.customer.name} · {o.request.city} · {o.request.quantity} adet · {formatDateTime(o.createdAt)}
                </p>
                {o.request.fileName && <a href={`/api/files/${o.requestId}`} className="link text-sm">📎 {o.request.fileName}</a>}
              </div>
              <div className="text-right text-sm">
                <p>Sipariş: <strong>{formatTL(o.amount)}</strong></p>
                <p className="text-ink-500">Komisyon ({formatBps(o.commissionBps)}): −{formatTL(o.commissionAmount)}</p>
                <p className="text-green-700">Net kazanç: <strong>{formatTL(o.businessEarning)}</strong></p>
                <div className="mt-1"><Badge status={o.status} /></div>
              </div>
            </div>
            <OrderProgress status={o.status} />
            {o.trackingInfo && <p className="mt-3 inline-flex rounded-lg bg-ink-50 px-3 py-1.5 font-mono text-xs">Kargo: {o.trackingInfo}</p>}
            {o.status === "IN_PROGRESS" && (
              <div className="mt-4 grid gap-3 border-t border-ink-100 pt-4 md:grid-cols-2">
                <ActionForm action={markShippedAction} className="flex gap-2">
                  <input type="hidden" name="orderId" value={o.id} />
                  <input className="input" name="trackingInfo" placeholder="Kargo firması ve takip no" />
                  <SubmitButton>Kargolandı</SubmitButton>
                </ActionForm>
                <ActionForm action={cancelOrderAction} confirm="Sipariş iptal edilecek ve tutar müşteriye iade edilecek." className="flex gap-2">
                  <input type="hidden" name="orderId" value={o.id} />
                  <input className="input" name="reason" placeholder="İptal nedeni" />
                  <SubmitButton className="btn-danger">İptal et</SubmitButton>
                </ActionForm>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { Empty, PageTitle } from "@/components/Shell";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatBps, formatTL } from "@/lib/money";
import { adminCancelOrderAction, adminCompleteOrderAction } from "../actions";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const { durum } = await searchParams;
  const orders = await prisma.order.findMany({
    where: durum ? { status: durum } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { request: true, customer: true, business: { include: { business: true } } },
  });
  return (
    <>
      <PageTitle eyebrow="Yönetim">Siparişler</PageTitle>
      <form className="mb-4 flex gap-2">
        <select className="input max-w-[12rem]" name="durum" defaultValue={durum ?? ""}>
          <option value="">Tümü</option>
          <option value="IN_PROGRESS">Hazırlanıyor</option>
          <option value="SHIPPED">Kargoda</option>
          <option value="COMPLETED">Tamamlandı</option>
          <option value="CANCELLED">İptal</option>
        </select>
        <button className="btn-secondary">Filtrele</button>
      </form>
      {orders.length === 0 && <Empty>Sipariş yok.</Empty>}
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="card text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">{o.request.title}</p>
                <p className="text-ink-500">
                  Müşteri: {o.customer.email} · İşletme: {o.business.business?.companyName} ({o.business.email})
                </p>
                <p className="text-ink-500">{formatDateTime(o.createdAt)}{o.trackingInfo ? ` · Kargo: ${o.trackingInfo}` : ""}</p>
                {o.cancelReason && <p className="text-ink-600">İptal: {o.cancelReason}</p>}
              </div>
              <div className="text-right">
                <p>{formatTL(o.amount)} · komisyon {formatBps(o.commissionBps)} = <strong>{formatTL(o.commissionAmount)}</strong></p>
                <p className="text-ink-500">İşletmeye: {formatTL(o.businessEarning)}</p>
                <Badge status={o.status} />
              </div>
            </div>
            {(o.status === "IN_PROGRESS" || o.status === "SHIPPED") && (
              <div className="mt-3 flex flex-wrap gap-3 border-t border-ink-100 pt-3">
                <ActionForm action={adminCompleteOrderAction} confirm="Sipariş tamamlanacak ve kazanç işletmeye aktarılacak.">
                  <input type="hidden" name="orderId" value={o.id} />
                  <SubmitButton className="btn-secondary">Tamamla (işletme lehine)</SubmitButton>
                </ActionForm>
                <ActionForm action={adminCancelOrderAction} confirm="Sipariş iptal edilecek ve tutarın tamamı müşteriye iade edilecek." className="flex gap-2">
                  <input type="hidden" name="orderId" value={o.id} />
                  <input className="input w-56" name="reason" placeholder="İptal nedeni" />
                  <SubmitButton className="btn-danger">İptal + iade (müşteri lehine)</SubmitButton>
                </ActionForm>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

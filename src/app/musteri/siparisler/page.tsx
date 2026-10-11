import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { Empty, PageTitle } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatTL } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { confirmDeliveryAction } from "../actions";

export default async function CustomerOrders() {
  const user = await requireUser("CUSTOMER");
  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { request: true, quote: true, business: { include: { business: true } } },
    }),
    getSettings(),
  ]);
  return (
    <>
      <PageTitle>Siparişlerim</PageTitle>
      {orders.length === 0 && <Empty>Henüz siparişin yok. Bir teklifi kabul ettiğinde burada görünür.</Empty>}
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{o.request.title}</p>
                <p className="text-sm text-gray-500">
                  {o.business.business?.companyName ?? o.business.name} · {formatDateTime(o.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatTL(o.amount)}</p>
                <Badge status={o.status} />
              </div>
            </div>
            {o.trackingInfo && <p className="mt-2 text-sm">Kargo: <strong>{o.trackingInfo}</strong></p>}
            {o.cancelReason && <p className="mt-2 text-sm text-gray-600">İptal nedeni: {o.cancelReason} (tutar bakiyene iade edildi)</p>}
            {(o.status === "SHIPPED" || o.status === "IN_PROGRESS") && (
              <ActionForm action={confirmDeliveryAction} confirm="Ürünü teslim aldığınızı onaylıyor musunuz? Ödeme işletmeye aktarılacak." className="mt-3">
                <input type="hidden" name="orderId" value={o.id} />
                <SubmitButton>Teslim aldım, onayla</SubmitButton>
                {o.status === "SHIPPED" && (
                  <p className="mt-2 text-xs text-gray-500">
                    Onaylamazsan sipariş kargolandıktan {settings.autoCompleteDays} gün sonra otomatik tamamlanır.
                    Sorun varsa destek ile iletişime geç.
                  </p>
                )}
              </ActionForm>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

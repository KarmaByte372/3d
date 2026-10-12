import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { LedgerTable } from "@/components/LedgerTable";
import { OrderMessages } from "@/components/OrderMessages";
import { OrderSummary } from "@/components/OrderSummary";
import { PageTitle } from "@/components/Shell";
import { SpecSheet } from "@/components/Spec";
import { prisma } from "@/lib/db";
import { adminCancelOrderAction, adminCompleteOrderAction } from "../../actions";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { request: true, customer: true, business: { include: { business: true } }, ledger: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) notFound();
  const active = order.status === "IN_PROGRESS" || order.status === "SHIPPED";

  return (
    <>
      <PageTitle eyebrow="Sipariş incelemesi" action={<Link href="/admin/siparisler" className="btn-secondary">← Siparişler</Link>}>
        {order.request.title}
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div className="space-y-6">
          <OrderSummary
            order={order}
            view="admin"
            counterpart={<>Müşteri: <strong>{order.customer.email}</strong> · Atölye: <strong>{order.business.business?.companyName}</strong> ({order.business.email})</>}
          />
          {active && (
            <div className="card grid gap-4 md:grid-cols-2">
              <ActionForm action={adminCompleteOrderAction} confirm="Sipariş tamamlanacak ve kazanç işletmeye aktarılacak.">
                <input type="hidden" name="orderId" value={order.id} />
                <p className="mb-2 text-sm text-ink-500">İş düzgün teslim edildiyse:</p>
                <SubmitButton className="btn-secondary w-full">Tamamla (atölye lehine)</SubmitButton>
              </ActionForm>
              <ActionForm action={adminCancelOrderAction} confirm="Sipariş iptal edilecek ve tutarın tamamı müşteriye iade edilecek." className="space-y-2">
                <input type="hidden" name="orderId" value={order.id} />
                <input className="input" name="reason" placeholder="Karar gerekçesi" />
                <SubmitButton className="btn-danger w-full">İptal + iade (müşteri lehine)</SubmitButton>
              </ActionForm>
            </div>
          )}
          <OrderMessages orderId={order.id} viewerId={null} canWrite={false} />
          <div>
            <h2 className="mb-2 text-lg font-semibold">Para hareketleri</h2>
            <LedgerTable entries={order.ledger} />
          </div>
        </div>
        <SpecSheet request={order.request} />
      </div>
    </>
  );
}

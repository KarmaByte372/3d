import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { IconStar } from "@/components/Icons";
import { OrderMessages } from "@/components/OrderMessages";
import { OrderSummary } from "@/components/OrderSummary";
import { PageTitle } from "@/components/Shell";
import { SpecSheet } from "@/components/Spec";
import { Stars } from "@/components/Stars";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelOrderAction, markShippedAction } from "../../actions";

export default async function BusinessOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("BUSINESS");
  const order = await prisma.order.findFirst({
    where: { id, businessId: user.id },
    include: { request: true, review: true, customer: true },
  });
  if (!order) notFound();

  return (
    <>
      <PageTitle eyebrow="Sipariş" action={<Link href="/isletme/siparisler" className="btn-secondary">← Siparişler</Link>}>
        {order.request.title}
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <OrderSummary order={order} view="business" counterpart={<>Müşteri: <strong className="text-ink-800">{order.customer.name}</strong></>} />
          {order.status === "IN_PROGRESS" && (
            <div className="card grid gap-4 md:grid-cols-2">
              <ActionForm action={markShippedAction} className="space-y-2">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="label" htmlFor="tracking">Kargo firması ve takip no</label>
                <input className="input" id="tracking" name="trackingInfo" placeholder="Yurtiçi 123456789" />
                <SubmitButton className="btn w-full">Kargoya verdim</SubmitButton>
              </ActionForm>
              <ActionForm action={cancelOrderAction} confirm="Sipariş iptal edilecek ve tutar müşteriye iade edilecek." className="space-y-2">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="label" htmlFor="reason">İptal nedeni</label>
                <input className="input" id="reason" name="reason" placeholder="Örn. malzeme temin edilemedi" />
                <SubmitButton className="btn-danger w-full">Siparişi iptal et</SubmitButton>
              </ActionForm>
            </div>
          )}
          <OrderMessages orderId={order.id} viewerId={user.id} canWrite={order.status !== "CANCELLED"} />
        </div>
        <div className="space-y-4">
          <SpecSheet request={order.request} />
          {order.review && (
            <div className="card">
              <h2 className="flex items-center gap-2 font-semibold"><IconStar className="h-5 w-5 text-amber-500" /> Müşteri değerlendirmesi</h2>
              <Stars value={order.review.rating} className="mt-2 text-xl" />
              {order.review.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{order.review.comment}</p>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

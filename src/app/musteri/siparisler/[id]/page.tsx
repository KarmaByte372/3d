import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { IconAlert, IconStar } from "@/components/Icons";
import { OrderMessages } from "@/components/OrderMessages";
import { OrderSummary } from "@/components/OrderSummary";
import { PageTitle } from "@/components/Shell";
import { StarInput } from "@/components/StarInput";
import { Stars } from "@/components/Stars";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { confirmDeliveryAction } from "../../actions";
import { openDisputeAction, submitReviewAction } from "../../../siparis-actions";

export default async function CustomerOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("CUSTOMER");
  const [order, settings] = await Promise.all([
    prisma.order.findFirst({
      where: { id, customerId: user.id },
      include: { request: true, review: true, business: { include: { business: true } } },
    }),
    getSettings(),
  ]);
  if (!order) notFound();
  const active = order.status === "IN_PROGRESS" || order.status === "SHIPPED";
  const shop = order.business.business;

  return (
    <>
      <PageTitle eyebrow="Sipariş" action={<Link href="/musteri/siparisler" className="btn-secondary">← Siparişlerim</Link>}>
        {order.request.title}
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <OrderSummary
            order={order}
            view="customer"
            counterpart={<>Atölye: <Link href={`/atolye/${order.businessId}`} className="link">{shop?.companyName ?? order.business.name}</Link></>}
          />
          <OrderMessages orderId={order.id} viewerId={user.id} canWrite={order.status !== "CANCELLED"} />
        </div>

        <div className="space-y-4">
          {active && (
            <div className="card">
              <h2 className="font-semibold">Ürünü teslim aldın mı?</h2>
              <p className="mt-1 text-sm text-ink-500">
                Onaylayınca ödeme atölyeye aktarılır.
                {order.status === "SHIPPED" && !order.disputed && ` Onaylamazsan kargodan ${settings.autoCompleteDays} gün sonra otomatik onaylanır.`}
              </p>
              <ActionForm action={confirmDeliveryAction} confirm="Ürünü teslim aldığınızı onaylıyor musunuz? Ödeme atölyeye aktarılacak." className="mt-4">
                <input type="hidden" name="orderId" value={order.id} />
                <SubmitButton className="btn w-full">Teslim aldım, onayla</SubmitButton>
              </ActionForm>
            </div>
          )}

          {active && !order.disputed && (
            <details className="card">
              <summary className="flex cursor-pointer items-center gap-2 font-semibold text-amber-800">
                <IconAlert className="h-5 w-5" /> Sorun bildir
              </summary>
              <p className="mt-2 text-sm text-ink-500">
                Ürün gelmedi, hasarlı ya da tarife uymuyorsa bildir. Otomatik onay durur, ödemen yönetici karar verene kadar güvende kalır.
              </p>
              <ActionForm action={openDisputeAction} className="mt-3 space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <textarea className="input min-h-24" name="reason" placeholder="Sorunu açıkla…" minLength={10} required />
                <SubmitButton className="btn-dark w-full">Bildir</SubmitButton>
              </ActionForm>
            </details>
          )}

          {order.status === "COMPLETED" && (
            <div className="card">
              <h2 className="flex items-center gap-2 font-semibold"><IconStar className="h-5 w-5 text-amber-500" /> Değerlendirme</h2>
              {order.review ? (
                <div className="mt-3">
                  <Stars value={order.review.rating} className="text-xl" />
                  {order.review.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{order.review.comment}</p>}
                </div>
              ) : (
                <ActionForm action={submitReviewAction} className="mt-3 space-y-3">
                  <input type="hidden" name="orderId" value={order.id} />
                  <div>
                    <p className="label">Puanın</p>
                    <StarInput name="rating" />
                  </div>
                  <textarea className="input min-h-20" name="comment" placeholder="Baskı kalitesi, iletişim, teslim süresi… (opsiyonel)" maxLength={1000} />
                  <SubmitButton className="btn w-full">Değerlendir</SubmitButton>
                </ActionForm>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

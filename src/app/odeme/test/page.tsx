import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { requireAnyUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatTL } from "@/lib/money";
import { getPaymentProvider } from "@/lib/payments";
import { confirmMockPaymentAction } from "../actions";

/** Yalnızca PAYMENT_PROVIDER=mock iken: gerçek sağlayıcının 3D Secure sayfasını taklit eder. */
export const dynamic = "force-dynamic";

export default async function MockPaymentPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  if ((await getPaymentProvider())?.name !== "mock") notFound();
  const { ref } = await searchParams;
  const user = await requireAnyUser();
  const topUp = ref ? await prisma.topUp.findFirst({ where: { reference: ref, userId: user.id, method: "CARD" } }) : null;
  if (!topUp) notFound();

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="card border-amber-300">
        <p className="mb-2 rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">TEST ÖDEME SAYFASI</p>
        <h1 className="text-xl font-bold">{formatTL(topUp.amount)}</h1>
        <p className="mb-4 text-sm text-ink-600">
          Gerçek kurulumda burası PayTR&apos;nin ödeme sayfasıdır. Referans: {topUp.reference}
        </p>
        {topUp.status === "PENDING" ? (
          <ActionForm action={confirmMockPaymentAction}>
            <input type="hidden" name="ref" value={topUp.reference} />
            <SubmitButton className="btn w-full">Ödemeyi onayla (test)</SubmitButton>
          </ActionForm>
        ) : (
          <p className="text-sm">Bu ödeme zaten işlendi.</p>
        )}
      </div>
    </main>
  );
}

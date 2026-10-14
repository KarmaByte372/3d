import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { requireAnyUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatTL } from "@/lib/money";
import { paytrIframeUrl } from "@/lib/paytr";

export const metadata = { title: "Güvenli ödeme" };

/** PayTR ödeme formu (iframe). Kart bilgileri doğrudan PayTR'ye girilir, bu siteye gelmez. */
export const dynamic = "force-dynamic";

export default async function PaytrPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const user = await requireAnyUser();
  const topUp = await prisma.topUp.findFirst({ where: { reference: ref, userId: user.id, method: "CARD", provider: "paytr" } });
  if (!topUp?.providerToken) notFound();
  const back = topUp.target === "CREDIT" ? "/isletme/bakiye" : "/musteri/bakiye";

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Logo />
        <Link href={back} className="text-sm text-ink-500 hover:text-ink-900">← Vazgeç</Link>
      </div>
      <div className="card mb-4 flex flex-wrap items-center justify-between gap-2 p-4">
        <span className="text-sm text-ink-500">Bakiye yükleme · <span className="font-mono">{topUp.reference}</span></span>
        <strong className="font-display text-xl">{formatTL(topUp.amount)}</strong>
      </div>
      {topUp.status === "PENDING" ? (
        <iframe
          src={paytrIframeUrl(topUp.providerToken)}
          title="PayTR güvenli ödeme"
          className="h-[760px] w-full rounded-2xl border border-ink-100 bg-white"
          allow="payment"
        />
      ) : (
        <p className="card text-sm">Bu ödeme işlendi. <Link className="link" href={back}>Bakiyene dön</Link></p>
      )}
      <p className="mt-3 text-center text-xs text-ink-400">Ödeme altyapısı PayTR · 3D Secure</p>
    </main>
  );
}

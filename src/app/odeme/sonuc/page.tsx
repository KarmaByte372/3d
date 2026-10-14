import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatTL } from "@/lib/money";
import { BreakOut } from "./BreakOut";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ödeme sonucu" };

/**
 * PayTR'nin kullanıcıyı döndürdüğü sayfa. Bakiyeyi bu sayfa değil, PayTR'nin imzalı bildirimi yükler;
 * burada yalnızca durumu gösteririz (bildirim birkaç saniye gecikebilir).
 */
export default async function PaymentResult({ searchParams }: { searchParams: Promise<{ durum?: string; ref?: string }> }) {
  const { durum, ref } = await searchParams;
  const user = await getCurrentUser();
  const topUp = user && ref ? await prisma.topUp.findFirst({ where: { reference: ref, userId: user.id } }) : null;
  const back = topUp?.target === "CREDIT" || user?.role === "BUSINESS" ? "/isletme/bakiye" : "/musteri/bakiye";

  let title = "Ödeme alınamadı";
  let body = "Kartından para çekilmediyse tekrar deneyebilirsin.";
  let tone = "text-red-600";
  if (topUp?.status === "APPROVED") {
    title = "Ödeme başarılı";
    body = `${formatTL(topUp.amount)} bakiyene yüklendi.`;
    tone = "text-emerald-600";
  } else if (durum === "basarili" && topUp?.status === "PENDING") {
    title = "Ödeme işleniyor";
    body = "PayTR onayı birkaç saniye içinde gelecek. Bakiye sayfasını birazdan yenile.";
    tone = "text-amber-600";
  } else if (topUp?.status === "REJECTED" && topUp.adminNote) {
    body = topUp.adminNote;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <BreakOut />
      <div className="mb-8 flex justify-center"><Logo /></div>
      <div className="card p-8">
        <h1 className={`mb-2 font-display text-2xl font-bold ${tone}`}>{title}</h1>
        <p className="mb-6 text-sm text-ink-600">{body}</p>
        <Link href={user ? back : "/giris"} className="btn w-full">{user ? "Bakiyeme dön" : "Giriş yap"}</Link>
      </div>
    </main>
  );
}

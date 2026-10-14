import Link from "next/link";
import { LedgerTable } from "@/components/LedgerTable";
import { PageTitle, Stat } from "@/components/Shell";
import { TopUpForms, TopUpHistory } from "@/components/TopUpPanel";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatTL } from "@/lib/money";

/** Atölyenin teklif bakiyesi: PayTR veya havale ile yüklenir, teklif ücretlerinde kullanılır, IBAN'a ödenmez. */
export default async function BusinessCreditPage() {
  const user = await requireUser("BUSINESS");
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [topUps, ledger, feesMonth] = await Promise.all([
    prisma.topUp.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.ledgerEntry.findMany({ where: { userId: user.id, wallet: "CREDIT" }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.ledgerEntry.aggregate({ where: { userId: user.id, type: "QUOTE_FEE", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
  ]);

  return (
    <>
      <PageTitle eyebrow="Cüzdan" description="Teklif ücretleri önce kazancından, yetmezse bu bakiyeden düşülür. Teklif verirken hangisinden ödeneceğini seçebilirsin.">
        Bakiye
      </PageTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat icon="IconWallet" accent="orange" label="Bakiye" value={formatTL(user.credit)} hint="Teklif ücretleri için" />
        <Stat icon="IconChart" accent="pink" label="Kazanç" value={formatTL(user.balance)} hint="Çarşamba IBAN'ına ödenir" />
        <Stat icon="IconQuote" accent="cyan" label="Bu ay teklif ücretleri" value={formatTL(-(feesMonth._sum.amount ?? 0))} />
      </div>

      <TopUpForms />

      <p className="mb-8 rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-500">
        Yüklenen bakiye yalnızca teklif ücretlerinde kullanılır, banka hesabına aktarılmaz ve iade edilmez.
        Teklif ücretinin nasıl hesaplandığını her talebin sayfasında görebilirsin; puanın yükseldikçe ücretin düşer.{" "}
        <Link href="/isletme/kazanc" className="link">Kazanç ve ödemeler →</Link>
      </p>

      <TopUpHistory topUps={topUps} />

      <h2 className="mb-2 text-lg font-semibold">Bakiye hareketleri</h2>
      <LedgerTable entries={ledger} />
    </>
  );
}

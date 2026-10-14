import { LedgerTable } from "@/components/LedgerTable";
import { PageTitle, Stat } from "@/components/Shell";
import { TopUpForms, TopUpHistory } from "@/components/TopUpPanel";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatTL } from "@/lib/money";

export default async function BalancePage() {
  const user = await requireUser("CUSTOMER");
  const [topUps, ledger, held] = await Promise.all([
    prisma.topUp.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.ledgerEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.order.aggregate({ where: { customerId: user.id, status: { in: ["IN_PROGRESS", "SHIPPED"] } }, _sum: { amount: true } }),
  ]);

  return (
    <>
      <PageTitle eyebrow="Cüzdan">Bakiye</PageTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat icon="IconWallet" accent="orange" label="Kullanılabilir bakiye" value={formatTL(user.balance)} />
        <Stat icon="IconShield" accent="cyan" label="Güvencedeki ödemeler" value={formatTL(held._sum.amount ?? 0)} hint="Devam eden siparişler için emanette" />
      </div>

      <TopUpForms />

      <p className="mb-8 rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-500">
        İptal edilen siparişlerin tutarı bakiyene iade edilir ve yeni siparişlerinde kullanılır. Bakiye banka hesabına aktarılmaz.
      </p>

      <TopUpHistory topUps={topUps} />

      <h2 className="mb-2 text-lg font-semibold">Hesap hareketleri</h2>
      <LedgerTable entries={ledger} />
    </>
  );
}

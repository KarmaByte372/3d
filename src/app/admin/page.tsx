import Link from "next/link";
import { PageTitle, Stat } from "@/components/Shell";
import { prisma } from "@/lib/db";
import { formatDate, isWednesday, nextWednesday } from "@/lib/dates";
import { formatBps, formatTL } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export default async function AdminHome() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [settings, customers, businesses, pendingTopUps, activeOrders, escrow, commissionAll, commissionMonth, owed, pendingPayouts, gmv] =
    await Promise.all([
      getSettings(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "BUSINESS" } }),
      prisma.topUp.count({ where: { status: "PENDING", method: "BANK_TRANSFER" } }),
      prisma.order.count({ where: { status: { in: ["IN_PROGRESS", "SHIPPED"] } } }),
      prisma.order.aggregate({ where: { status: { in: ["IN_PROGRESS", "SHIPPED"] } }, _sum: { amount: true } }),
      prisma.ledgerEntry.aggregate({ where: { userId: null, type: { in: ["COMMISSION", "QUOTE_FEE"] } }, _sum: { amount: true } }),
      prisma.ledgerEntry.groupBy({ by: ["type"], where: { userId: null, type: { in: ["COMMISSION", "QUOTE_FEE"] }, createdAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
      prisma.user.aggregate({ where: { role: "BUSINESS" }, _sum: { balance: true } }),
      prisma.payout.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
      prisma.order.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    ]);
  const feeMonth = commissionMonth.find((r) => r.type === "QUOTE_FEE");
  const comMonth = commissionMonth.find((r) => r.type === "COMMISSION");
  const revenueMonth = (feeMonth?._sum.amount ?? 0) + (comMonth?._sum.amount ?? 0);
  const credits = await prisma.user.aggregate({ where: { role: "BUSINESS" }, _sum: { credit: true } });
  const [disputes, pendingIds] = await Promise.all([
    prisma.order.count({ where: { disputed: true, status: { in: ["IN_PROGRESS", "SHIPPED"] } } }),
    prisma.user.count({ where: { identityStatus: "PENDING" } }),
  ]);

  return (
    <>
      <PageTitle eyebrow="Yönetim">Genel bakış</PageTitle>
      {isWednesday() && (pendingPayouts._count ?? 0) > 0 && (
        <div className="mb-5 rounded-lg border border-brand-500 bg-brand-50 p-4 text-sm">
          Bugün çarşamba: <strong>{pendingPayouts._count}</strong> ödeme ({formatTL(pendingPayouts._sum.amount ?? 0)}) gönderilmeyi bekliyor.{" "}
          <Link href="/admin/odemeler" className="link">Ödemelere git →</Link>
        </div>
      )}
      {(disputes > 0 || pendingTopUps > 0 || pendingIds > 0) && (
        <div className="mb-5 flex flex-wrap gap-2">
          {disputes > 0 && <Link href="/admin/siparisler?durum=DISPUTED" className="chip border-amber-300 bg-amber-50 text-amber-800">⚠ {disputes} anlaşmazlık bekliyor</Link>}
          {pendingIds > 0 && <Link href="/admin/kullanicilar?kimlik=PENDING" className="chip border-amber-300 bg-amber-50 text-amber-800">{pendingIds} kimlik onayı bekliyor</Link>}
          {pendingTopUps > 0 && <Link href="/admin/yuklemeler" className="chip">{pendingTopUps} havale onayı</Link>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon="IconChart" accent="orange" label="Gelir (bu ay)" value={formatTL(revenueMonth)}
          hint={`${feeMonth?._count ?? 0} teklif ücreti ${formatTL(feeMonth?._sum.amount ?? 0)} · komisyon ${formatBps(settings.commissionBps)} ${formatTL(comMonth?._sum.amount ?? 0)}`} />
        <Stat icon="IconLayers" accent="pink" label="Toplam gelir" value={formatTL(commissionAll._sum.amount ?? 0)} hint="Teklif ücretleri + komisyon" />
        <Stat icon="IconBox" accent="cyan" label="Tamamlanan işlem hacmi" value={formatTL(gmv._sum.amount ?? 0)} />
        <Stat icon="IconShield" accent="lime" label="Emanetteki tutar" value={formatTL(escrow._sum.amount ?? 0)} hint={`${activeOrders} aktif sipariş`} />
        <Stat icon="IconWallet" accent="orange" label="İşletmelere borç (kazanç)" value={formatTL(owed._sum.balance ?? 0)} hint={`Sonraki ödeme: ${formatDate(nextWednesday())}`} />
        <Stat icon="IconCalendar" accent="pink" label="Bekleyen ödemeler" value={formatTL(pendingPayouts._sum.amount ?? 0)} hint={`${pendingPayouts._count} transfer`} />
        <Stat icon="IconBank" accent="cyan" label="Onay bekleyen havale" value={String(pendingTopUps)} />
        <Stat icon="IconQuote" accent="lime" label="Atölye bakiyeleri" value={formatTL(credits._sum.credit ?? 0)} hint="Yüklenmiş, teklif ücretinde kullanılacak" />
        <Stat icon="IconUsers" accent="orange" label="Kullanıcılar" value={`${customers} / ${businesses}`} hint="Müşteri / işletme" />
      </div>
    </>
  );
}

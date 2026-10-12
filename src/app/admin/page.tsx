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
      prisma.ledgerEntry.aggregate({ where: { type: "COMMISSION" }, _sum: { amount: true } }),
      prisma.ledgerEntry.aggregate({ where: { type: "COMMISSION", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.user.aggregate({ where: { role: "BUSINESS" }, _sum: { balance: true } }),
      prisma.payout.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
      prisma.order.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    ]);
  const disputes = await prisma.order.count({ where: { disputed: true, status: { in: ["IN_PROGRESS", "SHIPPED"] } } });

  return (
    <>
      <PageTitle eyebrow="Yönetim">Genel bakış</PageTitle>
      {isWednesday() && (pendingPayouts._count ?? 0) > 0 && (
        <div className="mb-5 rounded-lg border border-brand-500 bg-brand-50 p-4 text-sm">
          Bugün çarşamba: <strong>{pendingPayouts._count}</strong> ödeme ({formatTL(pendingPayouts._sum.amount ?? 0)}) gönderilmeyi bekliyor.{" "}
          <Link href="/admin/odemeler" className="link">Ödemelere git →</Link>
        </div>
      )}
      {(disputes > 0 || pendingTopUps > 0) && (
        <div className="mb-5 flex flex-wrap gap-2">
          {disputes > 0 && <Link href="/admin/siparisler?durum=DISPUTED" className="chip border-amber-300 bg-amber-50 text-amber-800">⚠ {disputes} anlaşmazlık bekliyor</Link>}
          {pendingTopUps > 0 && <Link href="/admin/yuklemeler" className="chip">{pendingTopUps} havale onayı</Link>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon="IconChart" accent="orange" label="Komisyon geliri (bu ay)" value={formatTL(commissionMonth._sum.amount ?? 0)} hint={`Oran: ${formatBps(settings.commissionBps)}`} />
        <Stat icon="IconLayers" accent="pink" label="Toplam komisyon geliri" value={formatTL(commissionAll._sum.amount ?? 0)} />
        <Stat icon="IconBox" accent="cyan" label="Tamamlanan işlem hacmi" value={formatTL(gmv._sum.amount ?? 0)} />
        <Stat icon="IconShield" accent="lime" label="Emanetteki tutar" value={formatTL(escrow._sum.amount ?? 0)} hint={`${activeOrders} aktif sipariş`} />
        <Stat icon="IconWallet" accent="orange" label="İşletmelere borç (bakiye)" value={formatTL(owed._sum.balance ?? 0)} hint={`Sonraki ödeme: ${formatDate(nextWednesday())}`} />
        <Stat icon="IconCalendar" accent="pink" label="Bekleyen ödemeler" value={formatTL(pendingPayouts._sum.amount ?? 0)} hint={`${pendingPayouts._count} transfer`} />
        <Stat icon="IconBank" accent="cyan" label="Onay bekleyen havale" value={String(pendingTopUps)} />
        <Stat icon="IconUsers" accent="lime" label="Kullanıcılar" value={`${customers} / ${businesses}`} hint="Müşteri / işletme" />
      </div>
    </>
  );
}

import Link from "next/link";
import { PageTitle, Stat } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, nextWednesday } from "@/lib/dates";
import { formatBps, formatTL } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export default async function BusinessHome() {
  const user = await requireUser("BUSINESS");
  const [settings, openRequests, activeOrders, pendingQuotes, earned] = await Promise.all([
    getSettings(),
    prisma.printRequest.count({ where: { status: "OPEN", customerId: { not: user.id } } }),
    prisma.order.count({ where: { businessId: user.id, status: { in: ["IN_PROGRESS", "SHIPPED"] } } }),
    prisma.quote.count({ where: { businessId: user.id, status: "PENDING" } }),
    prisma.order.aggregate({ where: { businessId: user.id, status: "COMPLETED" }, _sum: { businessEarning: true } }),
  ]);
  const hasIban = !!user.business?.iban;

  return (
    <>
      <PageTitle>Hoş geldin, {user.business?.companyName}</PageTitle>
      {!hasIban && (
        <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Çarşamba ödemelerini alabilmek için <Link href="/isletme/profil" className="link">IBAN bilgini ekle</Link>.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ödenecek kazanç" value={formatTL(user.balance)}
          hint={`Sonraki ödeme: ${formatDate(nextWednesday())} (asgari ${formatTL(settings.minPayout)})`} />
        <Stat label="Toplam net kazanç" value={formatTL(earned._sum.businessEarning ?? 0)} hint={`Komisyon ${formatBps(settings.commissionBps)}`} />
        <Stat label="Aktif sipariş" value={String(activeOrders)} />
        <Stat label="Bekleyen teklif" value={String(pendingQuotes)} />
      </div>
      <div className="card mt-6 flex flex-wrap items-center justify-between gap-3">
        <p><strong>{openRequests}</strong> açık talep teklif bekliyor.</p>
        <Link href="/isletme/talepler" className="btn">Taleplere göz at</Link>
      </div>
    </>
  );
}

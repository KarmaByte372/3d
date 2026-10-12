import Link from "next/link";
import { IconArrowRight } from "@/components/Icons";
import { Stat } from "@/components/Shell";
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
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-ink-900 p-6 text-white sm:p-8">
        <div className="bg-plate absolute inset-0" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-filament-orange/25 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">Atölye paneli</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Hoş geldin, {user.business?.companyName}</h1>
            <p className="mt-2 text-sm text-ink-300">
              <strong className="text-white">{openRequests}</strong> açık talep teklif bekliyor.
            </p>
          </div>
          <Link href="/isletme/talepler" className="btn">Taleplere göz at <IconArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
      {settings.identityRequired === "true" && user.identityStatus === "PENDING" && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Kimliğin onay bekliyor.</strong> Yönetici onaylayana kadar talepleri görebilir ama teklif veremezsin. Onaylanınca bildirim alacaksın.
        </div>
      )}
      {!hasIban && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Çarşamba ödemelerini alabilmek için <Link href="/isletme/profil" className="link">IBAN bilgini ekle</Link>.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon="IconWallet" accent="orange" label="Ödenecek kazanç" value={formatTL(user.balance)}
          hint={`Sonraki ödeme: ${formatDate(nextWednesday())} (asgari ${formatTL(settings.minPayout)})`} />
        <Stat icon="IconChart" accent="pink" label="Toplam net kazanç" value={formatTL(earned._sum.businessEarning ?? 0)} hint={`Komisyon ${formatBps(settings.commissionBps)}`} />
        <Stat icon="IconNozzle" accent="cyan" label="Aktif sipariş" value={String(activeOrders)} />
        <Stat icon="IconQuote" accent="lime" label="Bekleyen teklif" value={String(pendingQuotes)} />
      </div>
    </>
  );
}

import Link from "next/link";
import { Badge } from "@/components/Badge";
import { LedgerTable } from "@/components/LedgerTable";
import { Empty, PageTitle, Stat } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, nextWednesday } from "@/lib/dates";
import { formatIban } from "@/lib/iban";
import { formatTL } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export default async function Earnings() {
  const user = await requireUser("BUSINESS");
  const [settings, payouts, ledger, inEscrow] = await Promise.all([
    getSettings(),
    prisma.payout.findMany({ where: { businessId: user.id }, orderBy: { createdAt: "desc" }, include: { batch: true } }),
    prisma.ledgerEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.order.aggregate({ where: { businessId: user.id, status: { in: ["IN_PROGRESS", "SHIPPED"] } }, _sum: { businessEarning: true } }),
  ]);
  const hasIban = !!user.business?.iban;
  const eligible = hasIban && user.balance >= settings.minPayout;

  return (
    <>
      <PageTitle eyebrow="Hakediş">Kazanç & ödemeler</PageTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat icon="IconWallet" accent="orange" label="Ödenecek kazanç" value={formatTL(user.balance)}
          hint={eligible ? `${formatDate(nextWednesday())} çarşamba günü IBAN'ına gönderilecek` :
            !hasIban ? "IBAN eklemeden ödeme yapılamaz" : `Asgari ödeme tutarı ${formatTL(settings.minPayout)}`} />
        <Stat icon="IconNozzle" accent="pink" label="Devam eden siparişlerden" value={formatTL(inEscrow._sum.businessEarning ?? 0)} hint="Teslim onaylanınca bakiyene geçer" />
        <Stat icon="IconBank" accent="cyan" label="Ödeme hesabı" value={hasIban ? formatIban(user.business!.iban!).slice(0, 14) + "…" : "Yok"}
          hint={hasIban ? user.business!.ibanHolder! : undefined} />
      </div>
      {!hasIban && (
        <p className="mb-6 text-sm"><Link href="/isletme/profil" className="link">IBAN ekle →</Link></p>
      )}

      <div className="relative mb-8 overflow-hidden rounded-2xl bg-ink-900 p-5 text-sm text-ink-200">
        <div className="bg-plate absolute inset-0" />
        <p className="relative">
        <strong className="text-white">Ödeme takvimi:</strong> Tamamlanan siparişlerin net kazancı bakiyene geçer. Her <strong className="text-filament-orange">çarşamba</strong> sabahı bakiyesi{" "}
        {formatTL(settings.minPayout)} ve üzeri olan işletmeler için ödeme oluşturulur ve gün içinde IBAN&apos;a gönderilir.
        </p>
      </div>

      <h2 className="mb-2 text-lg font-semibold">Ödemeler</h2>
      {payouts.length === 0 ? (
        <div className="mb-8"><Empty>Henüz ödeme yapılmadı.</Empty></div>
      ) : (
        <div className="card mb-8 overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Ödeme günü</th><th>Tutar</th><th>IBAN</th><th>Durum</th><th>Dekont</th><th>Ödenme</th></tr></thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td data-label="Ödeme günü">{formatDate(p.batch.payoutDate)}</td>
                  <td data-label="Tutar">{formatTL(p.amount)}</td>
                  <td data-label="IBAN" className="font-mono text-xs">{formatIban(p.iban)}</td>
                  <td data-label="Durum"><Badge status={p.status} />{p.failReason && <p className="text-xs text-red-600">{p.failReason}</p>}</td>
                  <td data-label="Dekont">{p.bankReference ?? "—"}</td>
                  <td data-label="Ödenme">{formatDateTime(p.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-2 text-lg font-semibold">Hesap hareketleri</h2>
      <LedgerTable entries={ledger} />
    </>
  );
}

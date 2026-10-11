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
      <PageTitle>Kazanç & ödemeler</PageTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Ödenecek kazanç" value={formatTL(user.balance)}
          hint={eligible ? `${formatDate(nextWednesday())} çarşamba günü IBAN'ına gönderilecek` :
            !hasIban ? "IBAN eklemeden ödeme yapılamaz" : `Asgari ödeme tutarı ${formatTL(settings.minPayout)}`} />
        <Stat label="Devam eden siparişlerden" value={formatTL(inEscrow._sum.businessEarning ?? 0)} hint="Teslim onaylanınca bakiyene geçer" />
        <Stat label="Ödeme hesabı" value={hasIban ? formatIban(user.business!.iban!).slice(0, 14) + "…" : "Yok"}
          hint={hasIban ? user.business!.ibanHolder! : undefined} />
      </div>
      {!hasIban && (
        <p className="mb-6 text-sm"><Link href="/isletme/profil" className="link">IBAN ekle →</Link></p>
      )}

      <div className="mb-8 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
        Ödeme takvimi: Tamamlanan siparişlerin net kazancı bakiyene geçer. Her <strong>çarşamba</strong> sabahı bakiyesi{" "}
        {formatTL(settings.minPayout)} ve üzeri olan işletmeler için ödeme oluşturulur ve gün içinde IBAN&apos;a gönderilir.
      </div>

      <h2 className="mb-2 text-lg font-semibold">Ödemeler</h2>
      {payouts.length === 0 ? (
        <div className="mb-8"><Empty>Henüz ödeme yapılmadı.</Empty></div>
      ) : (
        <div className="card mb-8 overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Ödeme günü</th><th>Tutar</th><th>IBAN</th><th>Durum</th><th>Dekont</th><th>Ödenme</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.batch.payoutDate)}</td>
                  <td>{formatTL(p.amount)}</td>
                  <td className="font-mono text-xs">{formatIban(p.iban)}</td>
                  <td><Badge status={p.status} />{p.failReason && <p className="text-xs text-red-600">{p.failReason}</p>}</td>
                  <td>{p.bankReference ?? "—"}</td>
                  <td>{formatDateTime(p.paidAt)}</td>
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

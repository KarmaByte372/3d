import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { IconBank, IconCard } from "@/components/Icons";
import { LedgerTable } from "@/components/LedgerTable";
import { PageTitle, Stat } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatTL } from "@/lib/money";
import { getPaymentProvider } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { bankTopUpAction, cardTopUpAction } from "../actions";

export default async function BalancePage() {
  const user = await requireUser("CUSTOMER");
  const [settings, topUps, ledger, held] = await Promise.all([
    getSettings(),
    prisma.topUp.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.ledgerEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.order.aggregate({ where: { customerId: user.id, status: { in: ["IN_PROGRESS", "SHIPPED"] } }, _sum: { amount: true } }),
  ]);
  const cardEnabled = !!getPaymentProvider();
  const limits = `${formatTL(settings.minTopUp)} – ${formatTL(settings.maxTopUp)}`;

  return (
    <>
      <PageTitle eyebrow="Cüzdan">Bakiye</PageTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat icon="IconWallet" accent="orange" label="Kullanılabilir bakiye" value={formatTL(user.balance)} />
        <Stat icon="IconShield" accent="cyan" label="Güvencedeki ödemeler" value={formatTL(held._sum.amount ?? 0)} hint="Devam eden siparişler için emanette" />
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><IconCard className="h-5 w-5 text-brand-600" /> Kartla yükle</h2>
          <p className="mb-3 text-sm text-ink-500">3D Secure ile anında. Limit: {limits}</p>
          {cardEnabled ? (
            <ActionForm action={cardTopUpAction} className="flex gap-2">
              <input className="input" name="amount" inputMode="decimal" placeholder="Tutar (TL)" required />
              <SubmitButton>Öde</SubmitButton>
            </ActionForm>
          ) : (
            <p className="text-sm text-amber-700">Kartla ödeme henüz aktif değil.</p>
          )}
        </div>
        <div className="card">
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><IconBank className="h-5 w-5 text-brand-600" /> Havale / EFT ile yükle</h2>
          <p className="mb-3 text-sm text-ink-500">
            {settings.bankName} · {settings.bankAccountHolder}<br />
            <span className="font-mono">{settings.bankIban}</span><br />
            Önce bildirim oluştur, açıklamaya verilen kodu yaz. Onaydan sonra bakiyene geçer.
          </p>
          <ActionForm action={bankTopUpAction} className="flex gap-2">
            <input className="input" name="amount" inputMode="decimal" placeholder="Tutar (TL)" required />
            <SubmitButton>Bildirim oluştur</SubmitButton>
          </ActionForm>
        </div>
      </div>

      {topUps.length > 0 && (
        <>
          <h2 className="mb-2 text-lg font-semibold">Yükleme talepleri</h2>
          <div className="card mb-8 overflow-x-auto p-0">
            <table className="table">
              <thead><tr><th>Tarih</th><th>Yöntem</th><th>Kod</th><th>Tutar</th><th>Durum</th><th>Not</th></tr></thead>
              <tbody>
                {topUps.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDateTime(t.createdAt)}</td>
                    <td>{t.method === "CARD" ? "Kart" : "Havale/EFT"}</td>
                    <td className="font-mono">{t.reference}</td>
                    <td>{formatTL(t.amount)}</td>
                    <td><Badge status={t.status} /></td>
                    <td>{t.adminNote ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="mb-2 text-lg font-semibold">Hesap hareketleri</h2>
      <LedgerTable entries={ledger} />
    </>
  );
}

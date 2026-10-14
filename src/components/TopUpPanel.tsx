import { ActionForm, SubmitButton } from "./ActionForm";
import { Badge } from "./Badge";
import { IconBank, IconCard } from "./Icons";
import { formatDateTime } from "@/lib/dates";
import { formatTL } from "@/lib/money";
import { getPaymentProvider } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { bankTopUpAction, cardTopUpAction } from "@/app/odeme/actions";

/** Kartla (PayTR) ve havale/EFT ile bakiye yükleme kartları — müşteri ve atölye bakiye sayfalarında ortak. */
export async function TopUpForms() {
  const [settings, provider] = await Promise.all([getSettings(), getPaymentProvider()]);
  const limits = `${formatTL(settings.minTopUp)} – ${formatTL(settings.maxTopUp)}`;
  return (
    <div className="mb-8 grid gap-4 md:grid-cols-2">
      <div className="card">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><IconCard className="h-5 w-5 text-brand-600" /> Kartla yükle</h2>
        <p className="mb-3 text-sm text-ink-500">PayTR güvencesiyle, 3D Secure ile anında. Limit: {limits}</p>
        {provider ? (
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
  );
}

type TopUpRow = { id: string; createdAt: Date; method: string; reference: string; amount: number; status: string; adminNote: string | null };

export function TopUpHistory({ topUps }: { topUps: TopUpRow[] }) {
  if (topUps.length === 0) return null;
  return (
    <>
      <h2 className="mb-2 text-lg font-semibold">Yükleme talepleri</h2>
      <div className="card mb-8 overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>Tarih</th><th>Yöntem</th><th>Kod</th><th>Tutar</th><th>Durum</th><th>Not</th></tr></thead>
          <tbody>
            {topUps.map((t) => (
              <tr key={t.id}>
                <td data-label="Tarih">{formatDateTime(t.createdAt)}</td>
                <td data-label="Yöntem">{t.method === "CARD" ? "Kart" : "Havale/EFT"}</td>
                <td data-label="Kod" className="font-mono">{t.reference}</td>
                <td data-label="Tutar">{formatTL(t.amount)}</td>
                <td data-label="Durum"><Badge status={t.status} /></td>
                <td data-label="Not">{t.method === "CARD" && t.status === "APPROVED" ? "" : (t.adminNote ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

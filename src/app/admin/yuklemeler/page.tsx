import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { Empty, PageTitle } from "@/components/Shell";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatTL } from "@/lib/money";
import { approveTopUpAction, rejectTopUpAction } from "../actions";

export default async function AdminTopUps() {
  const [pending, recent] = await Promise.all([
    prisma.topUp.findMany({ where: { status: "PENDING", method: "BANK_TRANSFER" }, orderBy: { createdAt: "asc" }, include: { user: true } }),
    prisma.topUp.findMany({ where: { status: { not: "PENDING" } }, orderBy: { processedAt: "desc" }, take: 50, include: { user: true } }),
  ]);
  return (
    <>
      <PageTitle>Bakiye yüklemeleri</PageTitle>
      <h2 className="mb-2 text-lg font-semibold">Onay bekleyen havale/EFT ({pending.length})</h2>
      <p className="mb-3 text-sm text-gray-500">Banka hesabında açıklamasında referans kodu bulunan ve tutarı eşleşen havaleyi gördükten sonra onaylayın.</p>
      {pending.length === 0 ? (
        <div className="mb-8"><Empty>Bekleyen bildirim yok.</Empty></div>
      ) : (
        <div className="mb-8 space-y-2">
          {pending.map((t) => (
            <div key={t.id} className="card flex flex-wrap items-center gap-4">
              <div className="min-w-[14rem] flex-1">
                <p className="font-semibold">{formatTL(t.amount)} · <span className="font-mono">{t.reference}</span></p>
                <p className="text-sm text-gray-500">{t.user.name} ({t.user.email}) · {formatDateTime(t.createdAt)}</p>
              </div>
              <ActionForm action={approveTopUpAction} confirm={`${formatTL(t.amount)} bakiyeye eklensin mi?`}>
                <input type="hidden" name="topUpId" value={t.id} />
                <SubmitButton>Onayla</SubmitButton>
              </ActionForm>
              <ActionForm action={rejectTopUpAction} className="flex gap-2">
                <input type="hidden" name="topUpId" value={t.id} />
                <input className="input w-48" name="note" placeholder="Red nedeni" />
                <SubmitButton className="btn-danger">Reddet</SubmitButton>
              </ActionForm>
            </div>
          ))}
        </div>
      )}
      <h2 className="mb-2 text-lg font-semibold">Son işlenenler</h2>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>İşlem</th><th>Kullanıcı</th><th>Yöntem</th><th>Kod</th><th>Tutar</th><th>Durum</th><th>Not</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {recent.map((t) => (
              <tr key={t.id}>
                <td>{formatDateTime(t.processedAt)}</td>
                <td>{t.user.email}</td>
                <td>{t.method === "CARD" ? "Kart" : "Havale"}</td>
                <td className="font-mono">{t.reference}</td>
                <td>{formatTL(t.amount)}</td>
                <td><Badge status={t.status} /></td>
                <td>{t.adminNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

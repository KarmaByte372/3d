import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { Empty, PageTitle } from "@/components/Shell";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatIban } from "@/lib/iban";
import { formatTL } from "@/lib/money";
import { withdrawalPaidAction, withdrawalRejectAction } from "../actions";

export default async function AdminWithdrawals() {
  const [pending, recent] = await Promise.all([
    prisma.withdrawal.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { user: true } }),
    prisma.withdrawal.findMany({ where: { status: { not: "PENDING" } }, orderBy: { processedAt: "desc" }, take: 50, include: { user: true } }),
  ]);
  return (
    <>
      <PageTitle eyebrow="Finans" description="Müşterilerin kullanılmayan bakiyelerini IBAN'larına çekme talepleri">Para çekme talepleri</PageTitle>
      <h2 className="mb-2 text-lg font-semibold">Bekleyenler ({pending.length})</h2>
      {pending.length === 0 ? (
        <div className="mb-8"><Empty icon="IconBank">Bekleyen talep yok.</Empty></div>
      ) : (
        <div className="mb-8 space-y-2">
          {pending.map((w) => (
            <div key={w.id} className="card flex flex-wrap items-center gap-4">
              <div className="min-w-[16rem] flex-1">
                <p className="font-semibold">{formatTL(w.amount)} · {w.ibanHolder}</p>
                <p className="font-mono text-xs">{formatIban(w.iban)}</p>
                <p className="text-sm text-ink-500">{w.user.email} · {formatDateTime(w.createdAt)}</p>
              </div>
              <ActionForm action={withdrawalPaidAction} className="flex gap-2">
                <input type="hidden" name="id" value={w.id} />
                <input className="input w-36" name="bankReference" placeholder="Dekont no" />
                <SubmitButton>Ödendi</SubmitButton>
              </ActionForm>
              <ActionForm action={withdrawalRejectAction} confirm="Tutar kullanıcının bakiyesine iade edilecek." className="flex gap-2">
                <input type="hidden" name="id" value={w.id} />
                <input className="input w-40" name="note" placeholder="Red nedeni" />
                <SubmitButton className="btn-danger">Reddet</SubmitButton>
              </ActionForm>
            </div>
          ))}
        </div>
      )}
      <h2 className="mb-2 text-lg font-semibold">Son işlenenler</h2>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>İşlem</th><th>Kullanıcı</th><th>Tutar</th><th>IBAN</th><th>Durum</th><th>Dekont / not</th></tr></thead>
          <tbody>
            {recent.map((w) => (
              <tr key={w.id}>
                <td>{formatDateTime(w.processedAt)}</td>
                <td>{w.user.email}</td>
                <td>{formatTL(w.amount)}</td>
                <td className="font-mono text-xs">{formatIban(w.iban)}</td>
                <td><Badge status={w.status} /></td>
                <td>{w.bankReference ?? w.adminNote ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

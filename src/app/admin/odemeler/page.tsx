import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { Empty, PageTitle } from "@/components/Shell";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, isWednesday, nextWednesday } from "@/lib/dates";
import { formatIban } from "@/lib/iban";
import { formatTL } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { markFailedAction, markPaidAction, runPayoutsAction } from "../actions";

export default async function AdminPayouts() {
  const [settings, batches, eligible] = await Promise.all([
    getSettings(),
    prisma.payoutBatch.findMany({
      orderBy: { payoutDate: "desc" },
      take: 12,
      include: { payouts: { include: { business: { include: { business: true } } }, orderBy: { amount: "desc" } } },
    }),
    prisma.user.aggregate({
      where: { role: "BUSINESS", status: "ACTIVE", business: { iban: { not: null } } },
      _sum: { balance: true },
    }),
  ]);
  const wednesday = isWednesday();

  return (
    <>
      <PageTitle>Çarşamba ödemeleri</PageTitle>
      <div className="card mb-6 space-y-3 text-sm">
        <p>
          Ödeme partisi her <strong>çarşamba 09:00</strong>&apos;da (İstanbul) otomatik oluşturulur: bakiyesi{" "}
          {formatTL(settings.minPayout)} ve üzeri, IBAN&apos;ı kayıtlı aktif işletmelerin tüm bakiyesi ödemeye alınır.
          Gün içinde bankadan transferleri yapıp her birini &quot;Ödendi&quot; olarak işaretleyin. Başarısız transferler işletme
          bakiyesine geri döner ve sonraki çarşambaya kalır.
        </p>
        <p className="text-gray-600">
          Sonraki ödeme günü: <strong>{formatDate(nextWednesday())}</strong> · IBAN&apos;lı işletmelerin toplam bakiyesi:{" "}
          <strong>{formatTL(eligible._sum.balance ?? 0)}</strong>
        </p>
        <ActionForm
          action={runPayoutsAction}
          confirm={wednesday ? "Bugünün ödeme partisi oluşturulsun/güncellensin mi?" :
            "Bugün çarşamba değil. Yine de bugünün tarihiyle ödeme partisi oluşturulsun mu?"}
        >
          <SubmitButton className={wednesday ? "btn" : "btn-secondary"}>
            {wednesday ? "Bugünün partisini oluştur / güncelle" : "Manuel parti oluştur (çarşamba dışı)"}
          </SubmitButton>
        </ActionForm>
      </div>

      {batches.length === 0 && <Empty>Henüz ödeme partisi yok.</Empty>}
      <div className="space-y-6">
        {batches.map((b) => {
          const pending = b.payouts.filter((p) => p.status === "PENDING");
          return (
            <section key={b.id} className="card p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
                <div>
                  <h2 className="font-semibold">{formatDate(b.payoutDate)}</h2>
                  <p className="text-sm text-gray-500">
                    {b.payouts.length} ödeme · {formatTL(b.totalAmount)} · {pending.length} bekliyor
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {pending.length > 0 && (
                    <a className="btn-secondary" href={`/api/admin/odemeler/${b.id}`}>Bekleyenleri CSV indir</a>
                  )}
                  <Badge status={b.status === "OPEN" ? "PENDING" : "COMPLETED"} />
                </div>
              </div>
              {b.payouts.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>İşletme</th><th>Hesap sahibi / IBAN</th><th>Tutar</th><th>Durum</th><th>İşlem</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {b.payouts.map((p) => (
                        <tr key={p.id}>
                          <td>{p.business.business?.companyName}<br /><span className="text-xs text-gray-500">{p.business.email}</span></td>
                          <td>{p.ibanHolder}<br /><span className="font-mono text-xs">{formatIban(p.iban)}</span></td>
                          <td className="whitespace-nowrap font-semibold">{formatTL(p.amount)}</td>
                          <td>
                            <Badge status={p.status} />
                            {p.paidAt && <p className="text-xs text-gray-500">{formatDateTime(p.paidAt)}</p>}
                            {p.bankReference && <p className="text-xs text-gray-500">Dekont: {p.bankReference}</p>}
                            {p.failReason && <p className="text-xs text-red-600">{p.failReason}</p>}
                          </td>
                          <td>
                            {p.status === "PENDING" && (
                              <div className="flex flex-col gap-2">
                                <ActionForm action={markPaidAction} className="flex gap-2">
                                  <input type="hidden" name="payoutId" value={p.id} />
                                  <input className="input w-36" name="bankReference" placeholder="Dekont no" />
                                  <SubmitButton>Ödendi</SubmitButton>
                                </ActionForm>
                                <ActionForm action={markFailedAction} confirm="Tutar işletmenin bakiyesine iade edilecek." className="flex gap-2">
                                  <input type="hidden" name="payoutId" value={p.id} />
                                  <input className="input w-36" name="reason" placeholder="Hata nedeni" />
                                  <SubmitButton className="btn-danger">Başarısız</SubmitButton>
                                </ActionForm>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

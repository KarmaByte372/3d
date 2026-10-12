import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { PageTitle } from "@/components/Shell";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatIban } from "@/lib/iban";
import { formatTL } from "@/lib/money";
import { adjustBalanceAction, createAdminAction, resetUserPasswordAction, setUserStatusAction, toggleVerifiedAction } from "../actions";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; rol?: string }> }) {
  const { q, rol } = await searchParams;
  const users = await prisma.user.findMany({
    where: {
      ...(rol ? { role: rol } : {}),
      ...(q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }, { business: { companyName: { contains: q } } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { business: true },
  });

  return (
    <>
      <PageTitle eyebrow="Yönetim">Kullanıcılar</PageTitle>
      <form className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" name="q" placeholder="Ad, e-posta, işletme" defaultValue={q} />
        <select className="input max-w-[10rem]" name="rol" defaultValue={rol ?? ""}>
          <option value="">Tümü</option>
          <option value="CUSTOMER">Müşteri</option>
          <option value="BUSINESS">İşletme</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button className="btn-secondary">Ara</button>
      </form>
      <details className="card mb-6">
        <summary className="cursor-pointer font-semibold">+ Yeni yönetici ekle</summary>
        <ActionForm action={createAdminAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="na-name">Ad soyad</label>
            <input className="input" id="na-name" name="name" required />
          </div>
          <div>
            <label className="label" htmlFor="na-email">E-posta</label>
            <input className="input" id="na-email" name="email" type="email" required />
          </div>
          <SubmitButton>Oluştur</SubmitButton>
        </ActionForm>
      </details>
      <div className="space-y-3">
        {users.map((u) => (
          <details key={u.id} className="card">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3">
              <span className="font-semibold">{u.business?.companyName ?? u.name}</span>
              <span className="text-sm text-ink-500">{u.email}</span>
              <Badge status={u.role} />
              <Badge status={u.status} />
              {u.business?.verified && <span className="text-xs text-green-700">✓ Doğrulanmış</span>}
              <span className="ml-auto font-medium">{formatTL(u.balance)}</span>
            </summary>
            <div className="mt-4 grid gap-4 border-t border-ink-100 pt-4 text-sm md:grid-cols-3">
              <div className="space-y-1">
                <p>Ad: {u.name}</p>
                <p>Telefon: {u.phone ?? "—"}</p>
                <p>Kayıt: {formatDateTime(u.createdAt)}</p>
                {u.business && (
                  <>
                    <p>Şehir: {u.business.city} · VKN: {u.business.taxNumber ?? "—"}</p>
                    <p>IBAN: {u.business.iban ? formatIban(u.business.iban) : "—"}</p>
                    <p>Hesap sahibi: {u.business.ibanHolder ?? "—"}</p>
                  </>
                )}
              </div>
              <div className="space-y-2">
                {u.role !== "ADMIN" && (
                  <ActionForm action={setUserStatusAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="status" value={u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
                    <SubmitButton className={u.status === "ACTIVE" ? "btn-danger" : "btn-secondary"}>
                      {u.status === "ACTIVE" ? "Askıya al" : "Aktifleştir"}
                    </SubmitButton>
                  </ActionForm>
                )}
                {u.role !== "ADMIN" && (
                  <ActionForm action={resetUserPasswordAction} confirm="Kullanıcıya geçici şifre atanacak ve tüm oturumları kapanacak. Devam edilsin mi?">
                    <input type="hidden" name="userId" value={u.id} />
                    <SubmitButton className="btn-secondary">Geçici şifre ver</SubmitButton>
                  </ActionForm>
                )}
                {u.business && (
                  <ActionForm action={toggleVerifiedAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <SubmitButton className="btn-secondary">{u.business.verified ? "Doğrulamayı kaldır" : "İşletmeyi doğrula"}</SubmitButton>
                  </ActionForm>
                )}
              </div>
              {u.role !== "ADMIN" && (
                <ActionForm action={adjustBalanceAction} confirm="Bakiye düzeltmesi yapılsın mı?" className="space-y-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <p className="font-medium">Bakiye düzeltme</p>
                  <input className="input" name="amount" placeholder="Tutar (örn. 100 veya -50)" required />
                  <input className="input" name="note" placeholder="Açıklama (zorunlu)" required />
                  <SubmitButton className="btn-secondary">Uygula</SubmitButton>
                </ActionForm>
              )}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}

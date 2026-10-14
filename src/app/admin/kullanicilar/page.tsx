import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/Badge";
import { PageTitle } from "@/components/Shell";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatIban } from "@/lib/iban";
import { formatPhone } from "@/lib/phone";
import { formatTL } from "@/lib/money";
import { adjustBalanceAction, approveIdentityAction, createAdminAction, rejectIdentityAction, resetUserPasswordAction, setUserStatusAction, toggleVerifiedAction } from "../actions";
import { maskedTcknOf } from "@/lib/identity";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; rol?: string; kimlik?: string }> }) {
  const { q, rol, kimlik } = await searchParams;
  const users = await prisma.user.findMany({
    where: {
      ...(rol ? { role: rol } : {}),
      ...(kimlik ? { identityStatus: kimlik } : {}),
      ...(q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }, { phone: { contains: q.replace(/\D/g, "").replace(/^0/, "") || q } }, { business: { companyName: { contains: q } } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { business: true },
  });

  return (
    <>
      <PageTitle eyebrow="Yönetim">Kullanıcılar</PageTitle>
      <form className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" name="q" placeholder="Ad, e-posta, telefon, işletme" defaultValue={q} />
        <select className="input max-w-[10rem]" name="rol" defaultValue={rol ?? ""}>
          <option value="">Tümü</option>
          <option value="CUSTOMER">Müşteri</option>
          <option value="BUSINESS">İşletme</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select className="input max-w-[12rem]" name="kimlik" defaultValue={kimlik ?? ""}>
          <option value="">Kimlik: tümü</option>
          <option value="PENDING">Onay bekleyen</option>
          <option value="VERIFIED">Doğrulanmış</option>
          <option value="REJECTED">Reddedilmiş</option>
          <option value="NONE">Girilmemiş</option>
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
              {u.role !== "ADMIN" && u.identityStatus !== "VERIFIED" && <Badge status={`ID_${u.identityStatus}`} />}
              <span className="ml-auto text-right font-medium">
                {formatTL(u.balance)}
                {u.role === "BUSINESS" && <span className="block text-[11px] font-normal text-ink-400">kazanç · bakiye {formatTL(u.credit)}</span>}
              </span>
            </summary>
            <div className="mt-4 grid gap-4 border-t border-ink-100 pt-4 text-sm md:grid-cols-3">
              <div className="space-y-1">
                <p>Ad: {u.name}</p>
                <p>Telefon: {formatPhone(u.phone)} {u.phoneVerifiedAt ? <span className="text-emerald-700">✓ doğrulandı</span> : <span className="text-amber-700">doğrulanmadı</span>}</p>
                <p>Kayıt: {formatDateTime(u.createdAt)}</p>
                {u.role !== "ADMIN" && (
                  <div className="mt-2 rounded-lg bg-ink-50 p-2">
                    <p className="font-medium">Kimlik: <Badge status={`ID_${u.identityStatus}`} /></p>
                    {u.legalFirstName && <p>{u.legalFirstName} {u.legalLastName} · {u.birthYear}</p>}
                    {u.tcknEnc && <p className="font-mono">TCKN: {maskedTcknOf(u)}</p>}
                    {u.identityMethod && <p className="text-xs text-ink-400">Yöntem: {u.identityMethod === "FORMAT" ? "algoritma kontrolü" : u.identityMethod === "ADMIN" ? "yönetici onayı" : "NVİ KPS"}</p>}
                    {u.identityNote && <p className="text-xs text-red-700">Not: {u.identityNote}</p>}
                  </div>
                )}
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
                {u.identityStatus === "PENDING" && (
                  <ActionForm action={approveIdentityAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <SubmitButton>Kimliği onayla</SubmitButton>
                  </ActionForm>
                )}
                {(u.identityStatus === "PENDING" || u.identityStatus === "VERIFIED") && u.role !== "ADMIN" && (
                  <ActionForm action={rejectIdentityAction} confirm="Kullanıcıdan kimlik bilgilerini yeniden girmesi istenecek." className="flex gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <input className="input min-w-0 flex-1" name="note" placeholder="Red nedeni" />
                    <SubmitButton className="btn-danger">Reddet</SubmitButton>
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
                  {u.role === "BUSINESS" && (
                    <select className="input" name="wallet" defaultValue="CREDIT">
                      <option value="CREDIT">Bakiye (teklif ücretleri) · {formatTL(u.credit)}</option>
                      <option value="BALANCE">Kazanç (çarşamba ödemesi) · {formatTL(u.balance)}</option>
                    </select>
                  )}
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

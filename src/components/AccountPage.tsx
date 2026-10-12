import { changePasswordAction, updateAccountAction } from "@/app/hesap-actions";
import { changePhoneAction } from "@/app/dogrula/actions";
import { formatPhone } from "@/lib/phone";
import { isIdentityRequired, maskedTcknOf } from "@/lib/identity";
import { Badge } from "./Badge";
import { ActionForm, SubmitButton } from "./ActionForm";
import { IconShield, IconUser } from "./Icons";
import { PageTitle } from "./Shell";
import { formatDateTime } from "@/lib/dates";

type U = {
  name: string;
  email: string;
  role: string;
  phone: string | null;
  phoneVerifiedAt: Date | null;
  pendingPhone: string | null;
  createdAt: Date;
  identityStatus: string;
  legalFirstName: string | null;
  legalLastName: string | null;
  birthYear: number | null;
  tcknEnc: string | null;
};

export async function AccountPage({ user }: { user: U }) {
  const identityOn = await isIdentityRequired();
  return (
    <>
      <PageTitle eyebrow="Hesap" description={`Üyelik: ${formatDateTime(user.createdAt)}`}>Hesabım</PageTitle>
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><IconUser className="h-5 w-5 text-brand-600" /> Kişisel bilgiler</h2>
          <ActionForm action={updateAccountAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="acc-email">E-posta</label>
              <input className="input bg-ink-50 text-ink-500" id="acc-email" value={user.email} disabled readOnly />
            </div>
            <div>
              <label className="label" htmlFor="acc-name">Ad soyad</label>
              <input className="input" id="acc-name" name="name" defaultValue={user.name} required />
            </div>
            <SubmitButton>Kaydet</SubmitButton>
          </ActionForm>
        </div>
        {user.role !== "ADMIN" && (identityOn || user.identityStatus !== "NONE") && (
          <div className="card p-6 lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Kimlik</h2>
              <Badge status={`ID_${user.identityStatus}`} />
            </div>
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[140px_1fr]">
              <dt className="text-ink-400">Ad soyad</dt><dd>{user.legalFirstName} {user.legalLastName}</dd>
              <dt className="text-ink-400">T.C. kimlik no</dt><dd className="font-mono">{maskedTcknOf(user) ?? "—"}</dd>
              <dt className="text-ink-400">Doğum yılı</dt><dd>{user.birthYear ?? "—"}</dd>
            </dl>
            {user.identityStatus === "PENDING" && (
              <p className="mt-3 text-sm text-amber-800">Bilgilerin yönetici onayı bekliyor. Onaylanınca bildirim alacaksın.</p>
            )}
            <p className="mt-3 text-xs text-ink-400">Kimlik bilgileri onaylandıktan sonra değiştirilemez; düzeltme için destek ile iletişime geç.</p>
          </div>
        )}
        <div className="card p-6 lg:col-span-2">
          <h2 className="mb-1 text-lg font-semibold">Cep telefonu</h2>
          <p className="mb-4 text-sm text-ink-500">
            {user.phoneVerifiedAt ? (
              <>
                <strong className="text-ink-800">{formatPhone(user.phone)}</strong>
                <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">SMS ile doğrulandı</span>
              </>
            ) : (
              "Doğrulanmış numara yok."
            )}
            {user.pendingPhone && <> · Doğrulama bekleyen yeni numara: {formatPhone(user.pendingPhone)} (<a href="/dogrula" className="link">doğrula</a>)</>}
          </p>
          <ActionForm action={changePhoneAction} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1">
              <label className="label" htmlFor="new-phone">Yeni numara</label>
              <input className="input" id="new-phone" name="phone" type="tel" inputMode="tel" placeholder="05XX XXX XX XX" required />
            </div>
            <SubmitButton className="btn-secondary">SMS kodu gönder</SubmitButton>
          </ActionForm>
          <p className="mt-2 text-xs text-ink-400">Yeni numara SMS koduyla doğrulanana kadar mevcut numaran geçerli kalır.</p>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><IconShield className="h-5 w-5 text-brand-600" /> Şifre değiştir</h2>
          <ActionForm action={changePasswordAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="pw-current">Mevcut şifre</label>
              <input className="input" id="pw-current" name="current" type="password" autoComplete="current-password" required />
            </div>
            <div>
              <label className="label" htmlFor="pw-next">Yeni şifre</label>
              <input className="input" id="pw-next" name="next" type="password" autoComplete="new-password" minLength={8} required />
              <p className="mt-1 text-xs text-ink-400">En az 8 karakter, en az bir harf ve bir rakam.</p>
            </div>
            <div>
              <label className="label" htmlFor="pw-confirm">Yeni şifre (tekrar)</label>
              <input className="input" id="pw-confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <SubmitButton className="btn-dark">Şifreyi değiştir</SubmitButton>
          </ActionForm>
        </div>
      </div>
    </>
  );
}

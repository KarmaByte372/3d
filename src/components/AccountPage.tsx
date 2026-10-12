import { changePasswordAction, updateAccountAction } from "@/app/hesap-actions";
import { ActionForm, SubmitButton } from "./ActionForm";
import { IconShield, IconUser } from "./Icons";
import { PageTitle } from "./Shell";
import { formatDateTime } from "@/lib/dates";

type U = { name: string; email: string; phone: string | null; createdAt: Date };

export function AccountPage({ user }: { user: U }) {
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
            <div>
              <label className="label" htmlFor="acc-phone">Telefon</label>
              <input className="input" id="acc-phone" name="phone" type="tel" defaultValue={user.phone ?? ""} />
            </div>
            <SubmitButton>Kaydet</SubmitButton>
          </ActionForm>
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

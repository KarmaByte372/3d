import { redirect } from "next/navigation";
import { logoutAction } from "../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AuthLayout } from "@/components/AuthLayout";
import { requireAnyUser } from "@/lib/auth";
import { isIdentityRequired, needsIdentity } from "@/lib/identity";
import { HOME_BY_ROLE } from "@/lib/session";
import { submitIdentityAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function IdentityPage() {
  const user = await requireAnyUser();
  if (!user.phoneVerifiedAt && user.role !== "ADMIN") redirect("/dogrula");
  if (!needsIdentity(user) || !(await isIdentityRequired())) redirect(HOME_BY_ROLE[user.role] ?? "/");
  const isBusiness = user.role === "BUSINESS";
  const thisYear = new Date().getFullYear();

  return (
    <AuthLayout
      title="Kimlik bilgilerin"
      subtitle={
        isBusiness
          ? "Güvenli bir pazaryeri için atölyelerin kimliğini doğruluyoruz. Onaylandıktan sonra teklif verebilirsin."
          : "Güvenli alışveriş için tüm üyelerin kimliğini doğruluyoruz. Bilgilerini kimliğindeki gibi yaz."
      }
      footer={
        <form action={logoutAction}>
          <button className="text-ink-500 hover:text-ink-800">Çıkış yap</button>
        </form>
      }
    >
      {user.identityStatus === "REJECTED" && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Önceki bilgilerin onaylanmadı: {user.identityNote}. Lütfen kontrol edip tekrar gönder.
        </p>
      )}
      <ActionForm action={submitIdentityAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="tckn">T.C. kimlik numarası</label>
          <input className="input font-mono tracking-widest" id="tckn" name="tckn" inputMode="numeric" pattern="\d{11}" maxLength={11}
            autoComplete="off" placeholder="11 haneli numara" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="firstName">Ad</label>
            <input className="input" id="firstName" name="firstName" autoComplete="given-name" defaultValue={user.legalFirstName ?? ""} required />
          </div>
          <div>
            <label className="label" htmlFor="lastName">Soyad</label>
            <input className="input" id="lastName" name="lastName" autoComplete="family-name" defaultValue={user.legalLastName ?? ""} required />
          </div>
        </div>
        <div className="max-w-[10rem]">
          <label className="label" htmlFor="birthYear">Doğum yılı</label>
          <input className="input" id="birthYear" name="birthYear" type="number" inputMode="numeric" min={1900} max={thisYear - 18}
            defaultValue={user.birthYear ?? ""} placeholder="1990" required />
        </div>
        <label className="flex items-start gap-2 text-sm text-ink-500">
          <input type="checkbox" name="consent" className="mt-1 accent-brand-500" required />
          <span>
            Kimlik bilgilerimin, <a href="/kvkk" target="_blank" className="link">KVKK Aydınlatma Metni</a>&apos;nde belirtilen amaçlarla
            (kimlik doğrulama, dolandırıcılığın önlenmesi) işlenmesini kabul ediyorum.
          </span>
        </label>
        <SubmitButton className="btn w-full py-3">{isBusiness ? "Onaya gönder" : "Doğrula ve devam et"}</SubmitButton>
        <p className="text-center text-xs text-ink-400">
          T.C. kimlik numaran şifrelenerek saklanır ve hiçbir ekranda tam olarak gösterilmez. 18 yaşından büyük olmalısın.
        </p>
      </ActionForm>
    </AuthLayout>
  );
}

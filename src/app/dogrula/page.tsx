import { redirect } from "next/navigation";
import { logoutAction } from "../actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AuthLayout } from "@/components/AuthLayout";
import { requireAnyUser } from "@/lib/auth";
import { maskPhone } from "@/lib/phone";
import { targetPhone } from "@/lib/phone-verify";
import { HOME_BY_ROLE } from "@/lib/session";
import { cancelChangeAction, changePhoneAction, confirmCodeAction, resendCodeAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function VerifyPhonePage() {
  const user = await requireAnyUser();
  const phone = targetPhone(user);
  const isChange = !!user.pendingPhone;

  // Doğrulanacak bir şey yoksa paneline dön
  if (!phone && (user.phoneVerifiedAt || user.role === "ADMIN")) redirect(HOME_BY_ROLE[user.role] ?? "/");

  return (
    <AuthLayout
      title={isChange ? "Yeni numaranı doğrula" : "Telefonunu doğrula"}
      subtitle={phone ? `${maskPhone(phone)} numarasına 6 haneli bir kod gönderdik.` : "Devam etmek için cep telefonu numaranı ekle."}
      footer={
        <form action={logoutAction}>
          <button className="text-ink-500 hover:text-ink-800">Farklı bir hesapla giriş yap</button>
        </form>
      }
    >
      {phone ? (
        <div className="space-y-5">
          <ActionForm action={confirmCodeAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="code">Doğrulama kodu</label>
              <input
                className="input text-center font-mono text-2xl tracking-[0.5em]"
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="••••••"
                required
                autoFocus
              />
            </div>
            <SubmitButton className="btn w-full py-3">Doğrula</SubmitButton>
          </ActionForm>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-4 text-sm">
            <ActionForm action={resendCodeAction}>
              <SubmitButton className="font-semibold text-brand-600 hover:underline">Kodu tekrar gönder</SubmitButton>
            </ActionForm>
            {isChange && (
              <form action={cancelChangeAction}>
                <button className="text-ink-500 hover:text-ink-800">Değişikliği iptal et</button>
              </form>
            )}
          </div>
          {!isChange && (
            <details className="text-sm">
              <summary className="cursor-pointer text-ink-500 hover:text-ink-800">Numaram yanlış, değiştirmek istiyorum</summary>
              <PhoneForm />
            </details>
          )}
        </div>
      ) : (
        <PhoneForm />
      )}
    </AuthLayout>
  );
}

function PhoneForm() {
  return (
    <ActionForm action={changePhoneAction} className="mt-3 space-y-3">
      <label className="label" htmlFor="phone">Cep telefonu</label>
      <input className="input" id="phone" name="phone" type="tel" inputMode="tel" placeholder="05XX XXX XX XX" required />
      <SubmitButton className="btn-dark w-full">Kod gönder</SubmitButton>
    </ActionForm>
  );
}

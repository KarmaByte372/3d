import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AuthLayout } from "@/components/AuthLayout";
import { requestResetAction } from "./actions";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Şifremi unuttum"
      subtitle="Hesabında kayıtlı cep telefonuna SMS ile sıfırlama kodu gönderelim."
      footer={<Link href="/giris" className="link">Girişe dön</Link>}
    >
      <ActionForm action={requestResetAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="phone">Cep telefonu</label>
          <input className="input" id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="05XX XXX XX XX" required autoFocus />
        </div>
        <SubmitButton className="btn w-full py-3">Kod gönder</SubmitButton>
      </ActionForm>
    </AuthLayout>
  );
}

import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AuthLayout } from "@/components/AuthLayout";
import { loginAction } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthLayout
      title="Tekrar hoş geldin"
      subtitle="Taleplerine, tekliflerine ve siparişlerine devam et."
      footer={<>Hesabın yok mu? <Link href="/kayit" className="link">Ücretsiz kayıt ol</Link></>}
    >
      <ActionForm action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div>
          <label className="label" htmlFor="email">E-posta</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" placeholder="ornek@mail.com" />
        </div>
        <div>
          <label className="label" htmlFor="password">Şifre</label>
          <input className="input" id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
        </div>
        <SubmitButton className="btn w-full py-3">Giriş yap</SubmitButton>
      </ActionForm>
    </AuthLayout>
  );
}

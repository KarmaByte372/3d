import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AuthLayout } from "@/components/AuthLayout";
import { loginAction } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; sebep?: string; sifre?: string }> }) {
  const { next, sebep, sifre } = await searchParams;
  return (
    <AuthLayout
      title="Tekrar hoş geldin"
      subtitle="Taleplerine, tekliflerine ve siparişlerine devam et."
      footer={<>Hesabın yok mu? <Link href="/kayit" className="link">Ücretsiz kayıt ol</Link></>}
    >
      {sebep === "ag" && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          İnternet bağlantın (IP adresin) değiştiği için güvenlik amacıyla oturumun kapatıldı. Lütfen tekrar giriş yap.
        </p>
      )}
      {sifre === "1" && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Şifren değiştirildi. Yeni şifrenle giriş yapabilirsin.
        </p>
      )}
      <ActionForm action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div>
          <label className="label" htmlFor="email">E-posta</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" placeholder="ornek@mail.com" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Şifre</label>
            <Link href="/sifremi-unuttum" className="mb-1.5 text-xs font-semibold text-brand-600 hover:underline">Şifremi unuttum</Link>
          </div>
          <input className="input" id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
        </div>
        <SubmitButton className="btn w-full py-3">Giriş yap</SubmitButton>
      </ActionForm>
    </AuthLayout>
  );
}

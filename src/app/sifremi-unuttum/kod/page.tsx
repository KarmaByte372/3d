import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AuthLayout } from "@/components/AuthLayout";
import { maskPhone, normalizeTrMobile } from "@/lib/phone";
import { requestResetAction, resetPasswordAction } from "../actions";

export default async function ResetWithCodePage({ searchParams }: { searchParams: Promise<{ tel?: string }> }) {
  const phone = normalizeTrMobile((await searchParams).tel ?? "");
  if (!phone) redirect("/sifremi-unuttum");
  return (
    <AuthLayout
      title="Yeni şifre belirle"
      subtitle={`${maskPhone(phone)} numarası kayıtlıysa bir kod gönderdik. Kod 5 dakika geçerlidir.`}
      footer={<Link href="/giris" className="link">Girişe dön</Link>}
    >
      <ActionForm action={resetPasswordAction} className="space-y-4">
        <input type="hidden" name="phone" value={phone} />
        <div>
          <label className="label" htmlFor="code">SMS kodu</label>
          <input className="input text-center font-mono text-2xl tracking-[0.5em]" id="code" name="code" inputMode="numeric"
            autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="••••••" required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="next">Yeni şifre</label>
          <input className="input" id="next" name="next" type="password" autoComplete="new-password" minLength={8} required />
          <p className="mt-1 text-xs text-ink-400">En az 8 karakter, en az bir harf ve bir rakam.</p>
        </div>
        <div>
          <label className="label" htmlFor="confirm">Yeni şifre (tekrar)</label>
          <input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <SubmitButton className="btn w-full py-3">Şifreyi değiştir</SubmitButton>
      </ActionForm>
      <ActionForm action={requestResetAction} className="mt-4 border-t border-ink-100 pt-4 text-center text-sm">
        <input type="hidden" name="phone" value={phone} />
        <SubmitButton className="font-semibold text-brand-600 hover:underline">Kodu tekrar gönder</SubmitButton>
      </ActionForm>
    </AuthLayout>
  );
}

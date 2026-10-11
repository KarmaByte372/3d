import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { loginAction } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Link href="/" className="text-xl font-bold text-brand-600">Baskı3D</Link>
      <div className="card mt-6">
        <h1 className="mb-4 text-xl font-bold">Giriş yap</h1>
        <ActionForm action={loginAction} className="space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <div>
            <label className="label" htmlFor="email">E-posta</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Şifre</label>
            <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <SubmitButton className="btn w-full">Giriş yap</SubmitButton>
        </ActionForm>
        <p className="mt-4 text-center text-sm text-gray-600">
          Hesabın yok mu? <Link href="/kayit" className="link">Kayıt ol</Link>
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  const { rol } = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Link href="/" className="text-xl font-bold text-brand-600">Baskı3D</Link>
      <div className="card mt-6">
        <h1 className="mb-4 text-xl font-bold">Kayıt ol</h1>
        <RegisterForm initialRole={rol === "isletme" ? "BUSINESS" : "CUSTOMER"} />
        <p className="mt-4 text-center text-sm text-gray-600">
          Zaten hesabın var mı? <Link href="/giris" className="link">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}

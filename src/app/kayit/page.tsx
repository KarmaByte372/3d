import Link from "next/link";
import { AuthLayout } from "@/components/AuthLayout";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  const { rol } = await searchParams;
  return (
    <AuthLayout
      title="Hesap oluştur"
      subtitle="Baskı yaptırmak ya da atölyeni büyütmek için ücretsiz katıl."
      footer={<>Zaten hesabın var mı? <Link href="/giris" className="link">Giriş yap</Link></>}
    >
      <RegisterForm initialRole={rol === "isletme" ? "BUSINESS" : "CUSTOMER"} />
    </AuthLayout>
  );
}

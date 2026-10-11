import { Shell } from "@/components/Shell";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("ADMIN");
  return (
    <Shell
      title="Admin"
      user={user}
      nav={[
        { href: "/admin", label: "Özet" },
        { href: "/admin/kullanicilar", label: "Kullanıcılar" },
        { href: "/admin/yuklemeler", label: "Bakiye yüklemeleri" },
        { href: "/admin/siparisler", label: "Siparişler" },
        { href: "/admin/odemeler", label: "Çarşamba ödemeleri" },
        { href: "/admin/ayarlar", label: "Ayarlar" },
      ]}
    >
      {children}
    </Shell>
  );
}

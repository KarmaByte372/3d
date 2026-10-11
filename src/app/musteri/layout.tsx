import { Shell } from "@/components/Shell";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("CUSTOMER");
  return (
    <Shell
      title="Müşteri"
      user={user}
      showBalance
      nav={[
        { href: "/musteri", label: "Taleplerim" },
        { href: "/musteri/talep/yeni", label: "Yeni talep" },
        { href: "/musteri/siparisler", label: "Siparişlerim" },
        { href: "/musteri/bakiye", label: "Bakiye" },
      ]}
    >
      {children}
    </Shell>
  );
}

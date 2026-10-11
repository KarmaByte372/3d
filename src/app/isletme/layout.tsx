import { Shell } from "@/components/Shell";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("BUSINESS");
  return (
    <Shell
      title={user.business?.companyName ?? "İşletme"}
      user={user}
      showBalance
      balanceLabel="Ödenecek kazanç"
      nav={[
        { href: "/isletme", label: "Özet" },
        { href: "/isletme/talepler", label: "Açık talepler" },
        { href: "/isletme/teklifler", label: "Tekliflerim" },
        { href: "/isletme/siparisler", label: "Siparişler" },
        { href: "/isletme/kazanc", label: "Kazanç & ödemeler" },
        { href: "/isletme/profil", label: "Profil & IBAN" },
      ]}
    >
      {children}
    </Shell>
  );
}

import { Shell } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { unreadCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("BUSINESS");
  const unread = await unreadCount(user.id);
  return (
    <Shell
      base="/isletme"
      unread={unread}
      title={user.business?.companyName ?? "İşletme"}
      user={user}
      showBalance
      balanceLabel="Ödenecek kazanç"
      nav={[
        { href: "/isletme", label: "Özet", icon: "IconHome" },
        { href: "/isletme/talepler", label: "Açık talepler", icon: "IconSearch" },
        { href: "/isletme/teklifler", label: "Tekliflerim", icon: "IconQuote" },
        { href: "/isletme/siparisler", label: "Siparişler", icon: "IconNozzle" },
        { href: "/isletme/kazanc", label: "Kazanç & ödemeler", icon: "IconWallet" },
        { href: "/isletme/profil", label: "Profil & IBAN", icon: "IconUser" },
      ]}
    >
      {children}
    </Shell>
  );
}

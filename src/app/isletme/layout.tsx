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
      wallets={[
        { label: "Kazanç", amount: user.balance, href: "/isletme/kazanc" },
        { label: "Bakiye", amount: user.credit, href: "/isletme/bakiye" },
      ]}
      nav={[
        { href: "/isletme", label: "Özet", icon: "IconHome" },
        { href: "/isletme/talepler", label: "Açık talepler", short: "Talepler", icon: "IconSearch" },
        { href: "/isletme/teklifler", label: "Tekliflerim", short: "Teklifler", icon: "IconQuote" },
        { href: "/isletme/siparisler", label: "Siparişler", icon: "IconNozzle" },
        { href: "/isletme/bakiye", label: "Bakiye", icon: "IconWallet" },
        { href: "/isletme/kazanc", label: "Kazanç & ödemeler", short: "Kazanç", icon: "IconChart" },
        { href: "/isletme/profil", label: "Profil & IBAN", icon: "IconUser" },
      ]}
    >
      {children}
    </Shell>
  );
}

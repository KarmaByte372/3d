import { Shell } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { unreadCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("CUSTOMER");
  const unread = await unreadCount(user.id);
  return (
    <Shell
      base="/musteri"
      unread={unread}
      title="Müşteri"
      user={user}
      showBalance
      nav={[
        { href: "/musteri", label: "Taleplerim", icon: "IconLayers" },
        { href: "/musteri/talep/yeni", label: "Yeni talep", icon: "IconPlus" },
        { href: "/musteri/siparisler", label: "Siparişlerim", icon: "IconBox" },
        { href: "/musteri/bakiye", label: "Bakiye", icon: "IconWallet" },
      ]}
    >
      {children}
    </Shell>
  );
}

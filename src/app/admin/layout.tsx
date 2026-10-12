import { Shell } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { unreadCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("ADMIN");
  const unread = await unreadCount(user.id);
  return (
    <Shell
      base="/admin"
      unread={unread}
      title="Admin"
      user={user}
      nav={[
        { href: "/admin", label: "Özet", icon: "IconChart" },
        { href: "/admin/kullanicilar", label: "Kullanıcılar", icon: "IconUsers" },
        { href: "/admin/yuklemeler", label: "Bakiye yüklemeleri", icon: "IconCard" },
        { href: "/admin/siparisler", label: "Siparişler", icon: "IconBox" },
        { href: "/admin/cekimler", label: "Para çekme", icon: "IconBank" },
        { href: "/admin/odemeler", label: "Çarşamba ödemeleri", icon: "IconCalendar" },
        { href: "/admin/ayarlar", label: "Ayarlar", icon: "IconSettings" },
      ]}
    >
      {children}
    </Shell>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { Empty, PageTitle } from "./Shell";

/** Son bildirimleri listeler ve görüntülenenleri okundu sayar. */
export async function NotificationsPage({ userId }: { userId: string }) {
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
  if (unreadIds.length) await prisma.notification.updateMany({ where: { id: { in: unreadIds } }, data: { read: true } });

  return (
    <>
      <PageTitle eyebrow="Gelen kutusu">Bildirimler</PageTitle>
      {items.length === 0 ? (
        <Empty icon="IconBell">Henüz bildirimin yok.</Empty>
      ) : (
        <ul className="card divide-y divide-ink-100 p-0">
          {items.map((n) => {
            const isNew = unreadIds.includes(n.id);
            const inner = (
              <div className="flex items-start gap-3 px-5 py-4">
                <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${isNew ? "bg-filament-pink" : "bg-ink-200"}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${isNew ? "font-semibold text-ink-900" : "text-ink-700"}`}>{n.title}</p>
                  {n.body && <p className="mt-0.5 truncate text-sm text-ink-500">{n.body}</p>}
                </div>
                <span className="whitespace-nowrap font-mono text-[11px] text-ink-400">{formatDateTime(n.createdAt)}</span>
              </div>
            );
            return (
              <li key={n.id} className={isNew ? "bg-brand-50/40" : ""}>
                {n.href ? <Link href={n.href} className="block transition hover:bg-ink-50">{inner}</Link> : inner}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

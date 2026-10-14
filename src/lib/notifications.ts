import { prisma, type Tx } from "./db";

type Input = { title: string; body?: string; href?: string };

/** Uygulama içi bildirim oluşturur. İşlem (transaction) içindeyse aynı işleme dahil edilir. */
export async function notify(db: Tx | typeof prisma, userId: string, n: Input) {
  await db.notification.create({ data: { userId, title: n.title, body: n.body ?? "", href: n.href ?? null } });
}

export async function notifyAdmins(db: Tx | typeof prisma, n: Input) {
  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  for (const a of admins) await notify(db, a.id, n);
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

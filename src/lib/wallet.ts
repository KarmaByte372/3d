import type { Tx } from "./db";
import { AppError } from "./errors";

type EntryInput = {
  type: string;
  description: string;
  orderId?: string;
  topUpId?: string;
  payoutId?: string;
  withdrawalId?: string;
};

/**
 * Kullanıcı bakiyesini atomik olarak değiştirir ve deftere kayıt düşer.
 * Borçlandırmada (delta < 0) bakiye yetersizse AppError fırlatır; bakiye asla eksiye düşmez.
 */
export async function changeBalance(tx: Tx, userId: string, delta: number, entry: EntryInput) {
  if (!Number.isInteger(delta) || delta === 0) throw new Error("Geçersiz bakiye değişimi");

  if (delta < 0) {
    const res = await tx.user.updateMany({
      where: { id: userId, balance: { gte: -delta } },
      data: { balance: { decrement: -delta } },
    });
    if (res.count === 0) throw new AppError("Yetersiz bakiye.");
  } else {
    await tx.user.update({ where: { id: userId }, data: { balance: { increment: delta } } });
  }

  const { balance } = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } });
  await tx.ledgerEntry.create({
    data: { userId, amount: delta, balanceAfter: balance, ...entry },
  });
  return balance;
}

/** Platform hesabına (kullanıcısız) defter kaydı — örn. komisyon geliri. */
export async function recordPlatformEntry(tx: Tx, amount: number, entry: EntryInput) {
  await tx.ledgerEntry.create({ data: { userId: null, amount, ...entry } });
}

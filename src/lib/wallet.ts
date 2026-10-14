import type { Tx } from "./db";
import { AppError } from "./errors";

/**
 * BALANCE: müşterinin harcanabilir bakiyesi / işletmenin çarşamba ödenecek kazancı.
 * CREDIT: yalnızca işletmede, PayTR veya havale ile yüklenen ve teklif ücretlerinde kullanılan bakiye.
 */
export type Wallet = "BALANCE" | "CREDIT";

type EntryInput = {
  type: string;
  description: string;
  orderId?: string;
  topUpId?: string;
  payoutId?: string;
};

const FIELD = { BALANCE: "balance", CREDIT: "credit" } as const;

/**
 * Kullanıcının bir cüzdanını atomik olarak değiştirir ve deftere kayıt düşer.
 * Borçlandırmada (delta < 0) tutar yetersizse AppError fırlatır; cüzdan asla eksiye düşmez.
 */
export async function changeWallet(tx: Tx, userId: string, wallet: Wallet, delta: number, entry: EntryInput) {
  if (!Number.isInteger(delta) || delta === 0) throw new Error("Geçersiz bakiye değişimi");
  const field = FIELD[wallet];

  if (delta < 0) {
    const res = await tx.user.updateMany({
      where: { id: userId, [field]: { gte: -delta } },
      data: { [field]: { decrement: -delta } },
    });
    if (res.count === 0) throw new AppError("Yetersiz bakiye.");
  } else {
    await tx.user.update({ where: { id: userId }, data: { [field]: { increment: delta } } });
  }

  const u = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true, credit: true } });
  const after = wallet === "CREDIT" ? u.credit : u.balance;
  await tx.ledgerEntry.create({
    data: { userId, wallet, amount: delta, balanceAfter: after, ...entry },
  });
  return after;
}

/** Müşteri bakiyesi / işletme kazancı */
export function changeBalance(tx: Tx, userId: string, delta: number, entry: EntryInput) {
  return changeWallet(tx, userId, "BALANCE", delta, entry);
}

/** Platform hesabına (kullanıcısız) defter kaydı — örn. komisyon veya teklif ücreti geliri. */
export async function recordPlatformEntry(tx: Tx, amount: number, entry: EntryInput) {
  await tx.ledgerEntry.create({ data: { userId: null, amount, ...entry } });
}

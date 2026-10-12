import { prisma } from "./db";
import { AppError } from "./errors";
import { normalizeTrIban } from "./iban";
import { notify, notifyAdmins } from "./notifications";
import { changeBalance } from "./wallet";

export const MIN_WITHDRAWAL = 5000;

/** Müşteri kullanılmayan bakiyesini çekmek ister; tutar hemen bakiyeden ayrılır. */
export async function requestWithdrawal(userId: string, amount: number, ibanInput: string, ibanHolder: string) {
  if (amount < MIN_WITHDRAWAL) throw new AppError(`En az ${MIN_WITHDRAWAL / 100} TL çekilebilir.`);
  const iban = normalizeTrIban(ibanInput);
  if (!iban) throw new AppError("IBAN geçersiz.");
  if (ibanHolder.trim().length < 3) throw new AppError("Hesap sahibinin adını girin.");
  const pending = await prisma.withdrawal.count({ where: { userId, status: "PENDING" } });
  if (pending > 0) throw new AppError("Bekleyen bir çekim talebiniz var; sonuçlanınca yenisini oluşturabilirsiniz.");

  return prisma.$transaction(async (tx) => {
    const w = await tx.withdrawal.create({ data: { userId, amount, iban, ibanHolder: ibanHolder.trim() } });
    await changeBalance(tx, userId, -amount, { type: "WITHDRAWAL", description: "Para çekme talebi", withdrawalId: w.id });
    await notifyAdmins(tx, { title: "Yeni para çekme talebi", href: "/admin/cekimler" });
    return w;
  });
}

export async function markWithdrawalPaid(id: string, bankReference: string) {
  await prisma.$transaction(async (tx) => {
    const res = await tx.withdrawal.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "PAID", bankReference: bankReference || null, processedAt: new Date() },
    });
    if (res.count === 0) throw new AppError("Talep güncellenemedi.");
    const w = await tx.withdrawal.findUniqueOrThrow({ where: { id } });
    await notify(tx, w.userId, { title: "Para çekme talebiniz ödendi", href: "/musteri/bakiye" });
  });
}

/** Reddedilen talebin tutarı bakiyeye geri eklenir. */
export async function rejectWithdrawal(id: string, note: string) {
  await prisma.$transaction(async (tx) => {
    const res = await tx.withdrawal.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "REJECTED", adminNote: note || null, processedAt: new Date() },
    });
    if (res.count === 0) throw new AppError("Talep güncellenemedi.");
    const w = await tx.withdrawal.findUniqueOrThrow({ where: { id } });
    await changeBalance(tx, w.userId, w.amount, {
      type: "WITHDRAWAL_REVERSAL",
      description: `Çekim reddedildi: ${note || "belirtilmedi"}`,
      withdrawalId: id,
    });
    await notify(tx, w.userId, { title: "Para çekme talebiniz reddedildi", body: note, href: "/musteri/bakiye" });
  });
}

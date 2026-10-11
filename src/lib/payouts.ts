import { prisma } from "./db";
import { AppError } from "./errors";
import { getSettings } from "./settings";
import { istanbulDate } from "./dates";
import { changeBalance } from "./wallet";

/**
 * Çarşamba ödeme partisini oluşturur. Asgari tutarı aşan ve IBAN'ı kayıtlı her aktif işletmenin
 * tüm bakiyesi ödeme kaydına aktarılır (bakiyeden düşülür). Aynı gün için tekrar çağrılırsa
 * mevcut partiye yalnızca henüz dahil edilmemiş işletmeleri ekler.
 */
export async function createPayoutBatch(now = new Date()) {
  const { minPayout } = await getSettings();
  const payoutDate = istanbulDate(now);

  const batch = await prisma.payoutBatch.upsert({
    where: { payoutDate },
    create: { payoutDate },
    update: {},
  });

  const businesses = await prisma.user.findMany({
    where: {
      role: "BUSINESS",
      status: "ACTIVE",
      balance: { gte: minPayout },
      business: { iban: { not: null }, ibanHolder: { not: null } },
      payouts: { none: { batchId: batch.id } },
    },
    include: { business: true },
  });

  let created = 0;
  for (const b of businesses) {
    try {
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.user.findUniqueOrThrow({ where: { id: b.id }, select: { balance: true } });
        if (fresh.balance < minPayout) return;
        const payout = await tx.payout.create({
          data: {
            batchId: batch.id,
            businessId: b.id,
            amount: fresh.balance,
            iban: b.business!.iban!,
            ibanHolder: b.business!.ibanHolder!,
          },
        });
        await changeBalance(tx, b.id, -fresh.balance, {
          type: "PAYOUT",
          description: `Haftalık ödeme (${payoutDate})`,
          payoutId: payout.id,
        });
        await tx.payoutBatch.update({
          where: { id: batch.id },
          data: { totalAmount: { increment: fresh.balance } },
        });
        created++;
      });
    } catch (e) {
      console.error(`Ödeme oluşturulamadı: ${b.id}`, e);
    }
  }

  const pending = await prisma.payout.count({ where: { batchId: batch.id, status: "PENDING" } });
  await prisma.payoutBatch.update({
    where: { id: batch.id },
    data: { status: pending > 0 ? "OPEN" : "COMPLETED" },
  });
  return { batchId: batch.id, payoutDate, created };
}

/** Admin bankadan transferi yaptıktan sonra ödemeyi "ödendi" olarak işaretler. */
export async function markPayoutPaid(payoutId: string, bankReference: string) {
  const res = await prisma.payout.updateMany({
    where: { id: payoutId, status: "PENDING" },
    data: { status: "PAID", bankReference: bankReference || null, paidAt: new Date() },
  });
  if (res.count === 0) throw new AppError("Ödeme güncellenemedi.");
  await closeBatchIfDone(payoutId);
}

/** Transfer başarısız olduysa tutar işletmenin bakiyesine geri eklenir; bir sonraki çarşamba tekrar denenir. */
export async function markPayoutFailed(payoutId: string, reason: string) {
  await prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new AppError("Ödeme bulunamadı.");
    const res = await tx.payout.updateMany({
      where: { id: payoutId, status: "PENDING" },
      data: { status: "FAILED", failReason: reason || "Belirtilmedi" },
    });
    if (res.count === 0) throw new AppError("Ödeme güncellenemedi.");
    await changeBalance(tx, payout.businessId, payout.amount, {
      type: "PAYOUT_REVERSAL",
      description: `Başarısız ödeme iadesi: ${reason || "Belirtilmedi"}`,
      payoutId,
    });
    await tx.payoutBatch.update({
      where: { id: payout.batchId },
      data: { totalAmount: { decrement: payout.amount } },
    });
  });
  await closeBatchIfDone(payoutId);
}

async function closeBatchIfDone(payoutId: string) {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) return;
  const pending = await prisma.payout.count({ where: { batchId: payout.batchId, status: "PENDING" } });
  if (pending === 0) {
    await prisma.payoutBatch.update({ where: { id: payout.batchId }, data: { status: "COMPLETED" } });
  }
}

import crypto from "node:crypto";
import { prisma } from "./db";
import { AppError } from "./errors";
import { getSettings } from "./settings";
import { changeBalance } from "./wallet";
import { notify, notifyAdmins } from "./notifications";
import { formatTL } from "./money";

/**
 * Kartla ödeme sağlayıcısı. Gerçek entegrasyon (iyzico, PayTR vb.) bu arayüzü uygular:
 * `start` müşteriyi sağlayıcının 3D Secure ödeme sayfasına yönlendiren bir URL döndürür,
 * sağlayıcı geri bildirimi (callback) doğrulandıktan sonra `completeTopUp` çağrılır.
 * Kart bilgileri asla bu uygulamada tutulmaz.
 */
export interface PaymentProvider {
  name: string;
  start(topUp: { id: string; reference: string; amount: number }): Promise<{ redirectUrl: string }>;
}

const mockProvider: PaymentProvider = {
  name: "mock",
  async start(topUp) {
    return { redirectUrl: `/musteri/bakiye/test-odeme?ref=${encodeURIComponent(topUp.reference)}` };
  },
};

export function getPaymentProvider(): PaymentProvider | null {
  const name = process.env.PAYMENT_PROVIDER ?? "none";
  if (name === "mock") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") return null;
    return mockProvider;
  }
  return null;
}

function newReference(prefix: string) {
  return `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

async function validateAmount(amount: number) {
  const { minTopUp, maxTopUp } = await getSettings();
  if (amount < minTopUp || amount > maxTopUp) {
    throw new AppError(`Yükleme tutarı ${minTopUp / 100} TL ile ${maxTopUp / 100} TL arasında olmalı.`);
  }
}

export async function startCardTopUp(userId: string, amount: number) {
  const provider = getPaymentProvider();
  if (!provider) throw new AppError("Kartla ödeme şu anda kullanılamıyor. Lütfen havale/EFT ile yükleyin.");
  await validateAmount(amount);
  const topUp = await prisma.topUp.create({
    data: { userId, amount, method: "CARD", reference: newReference("KRT") },
  });
  return provider.start(topUp);
}

export async function createBankTransferTopUp(userId: string, amount: number) {
  await validateAmount(amount);
  const pending = await prisma.topUp.count({ where: { userId, status: "PENDING", method: "BANK_TRANSFER" } });
  if (pending >= 3) throw new AppError("Onay bekleyen en fazla 3 havale bildiriminiz olabilir.");
  const topUp = await prisma.topUp.create({
    data: { userId, amount, method: "BANK_TRANSFER", reference: newReference("HVL") },
  });
  await notifyAdmins(prisma, { title: "Yeni havale bildirimi", body: formatTL(amount), href: "/admin/yuklemeler" });
  return topUp;
}

/** Ödeme onaylandığında (sağlayıcı callback'i veya admin havale onayı) bakiyeyi yükler. */
export async function completeTopUp(topUpId: string, adminNote?: string) {
  await prisma.$transaction(async (tx) => {
    const res = await tx.topUp.updateMany({
      where: { id: topUpId, status: "PENDING" },
      data: { status: "APPROVED", processedAt: new Date(), adminNote: adminNote || null },
    });
    if (res.count === 0) throw new AppError("Bu yükleme zaten işlenmiş.");
    const topUp = await tx.topUp.findUniqueOrThrow({ where: { id: topUpId } });
    await changeBalance(tx, topUp.userId, topUp.amount, {
      type: "TOPUP",
      description: topUp.method === "CARD" ? "Kartla bakiye yükleme" : "Havale/EFT ile bakiye yükleme",
      topUpId,
    });
    await notify(tx, topUp.userId, { title: `${formatTL(topUp.amount)} bakiyene yüklendi`, href: "/musteri/bakiye" });
  });
}

export async function rejectTopUp(topUpId: string, adminNote: string) {
  const res = await prisma.topUp.updateMany({
    where: { id: topUpId, status: "PENDING" },
    data: { status: "REJECTED", processedAt: new Date(), adminNote: adminNote || null },
  });
  if (res.count === 0) throw new AppError("Bu yükleme zaten işlenmiş.");
  const t = await prisma.topUp.findUniqueOrThrow({ where: { id: topUpId } });
  await notify(prisma, t.userId, { title: "Havale bildirimin reddedildi", body: adminNote, href: "/musteri/bakiye" });
}

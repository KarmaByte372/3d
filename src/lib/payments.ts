import crypto from "node:crypto";
import { prisma } from "./db";
import { AppError } from "./errors";
import { getSettings } from "./settings";
import { changeWallet, type Wallet } from "./wallet";
import { notify, notifyAdmins } from "./notifications";
import { formatTL } from "./money";
import { getPaytrConfig, paytrReady } from "./integrations";
import { requestPaytrToken } from "./paytr";

/**
 * Kartla ödeme sağlayıcısı. `start` kullanıcıyı ödeme sayfasına yönlendiren bir URL döndürür;
 * sağlayıcının imzalı bildirimi doğrulandıktan sonra `completeTopUp` çağrılır.
 * Kart bilgileri asla bu uygulamada tutulmaz.
 */
type StartContext = {
  user: { email: string; name: string; phone: string | null };
  ip: string;
  origin: string;
};
type TopUpRow = { id: string; reference: string; amount: number; target: string };

export interface PaymentProvider {
  name: "mock" | "paytr";
  start(topUp: TopUpRow, ctx: StartContext): Promise<{ redirectUrl: string }>;
}

const mockProvider: PaymentProvider = {
  name: "mock",
  async start(topUp) {
    return { redirectUrl: `/odeme/test?ref=${encodeURIComponent(topUp.reference)}` };
  },
};

const paytrProvider: PaymentProvider = {
  name: "paytr",
  async start(topUp, ctx) {
    const cfg = await getPaytrConfig();
    const { siteName } = await getSettings();
    const back = (durum: string) => `${ctx.origin}/odeme/sonuc?durum=${durum}&ref=${encodeURIComponent(topUp.reference)}`;
    let token: string;
    try {
      token = await requestPaytrToken({
        merchantId: cfg.merchantId,
        merchantKey: cfg.merchantKey,
        merchantSalt: cfg.merchantSalt,
        userIp: ctx.ip,
        merchantOid: topUp.reference,
        email: ctx.user.email,
        paymentAmount: topUp.amount,
        basket: [[`${siteName} ${topUp.target === "CREDIT" ? "atölye bakiyesi" : "bakiye"} yükleme`, (topUp.amount / 100).toFixed(2), 1]],
        maxInstallment: cfg.maxInstallment,
        testMode: cfg.testMode,
        userName: ctx.user.name,
        userAddress: "Türkiye",
        userPhone: ctx.user.phone ? `0${ctx.user.phone}` : "05000000000",
        okUrl: back("basarili"),
        failUrl: back("hata"),
      });
    } catch (e) {
      console.error("PayTR jeton hatası", e);
      await prisma.topUp.update({
        where: { id: topUp.id },
        data: { status: "REJECTED", processedAt: new Date(), adminNote: String((e as Error).message).slice(0, 300) },
      });
      throw new AppError("Ödeme sayfası açılamadı. Lütfen biraz sonra tekrar deneyin.");
    }
    await prisma.topUp.update({ where: { id: topUp.id }, data: { providerToken: token } });
    return { redirectUrl: `/odeme/${encodeURIComponent(topUp.reference)}` };
  },
};

/** Öncelik: admin panelinde etkin PayTR → PAYMENT_PROVIDER=mock (geliştirme/test) → kapalı */
export async function getPaymentProvider(): Promise<PaymentProvider | null> {
  if (paytrReady(await getPaytrConfig())) return paytrProvider;
  if ((process.env.PAYMENT_PROVIDER ?? "none") === "mock") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") return null;
    return mockProvider;
  }
  return null;
}

/** PayTR merchant_oid yalnızca harf/rakam kabul eder; kart referansları bu yüzden tiresiz. */
function newReference(prefix: string, dash = true) {
  return `${prefix}${dash ? "-" : ""}${crypto.randomBytes(dash ? 4 : 6).toString("hex").toUpperCase()}`;
}

async function validateAmount(amount: number) {
  const { minTopUp, maxTopUp } = await getSettings();
  if (amount < minTopUp || amount > maxTopUp) {
    throw new AppError(`Yükleme tutarı ${minTopUp / 100} TL ile ${maxTopUp / 100} TL arasında olmalı.`);
  }
}

/** Kullanıcının rolüne göre yüklemenin gideceği cüzdan: müşteri → bakiye, atölye → teklif bakiyesi */
export function topUpTargetFor(role: string): Wallet {
  if (role === "CUSTOMER") return "BALANCE";
  if (role === "BUSINESS") return "CREDIT";
  throw new AppError("Bu hesap bakiye yükleyemez.");
}

export async function startCardTopUp(
  user: { id: string; role: string; email: string; name: string; phone: string | null },
  amount: number,
  ctx: { ip: string; origin: string },
) {
  const provider = await getPaymentProvider();
  if (!provider) throw new AppError("Kartla ödeme şu anda kullanılamıyor. Lütfen havale/EFT ile yükleyin.");
  await validateAmount(amount);
  const topUp = await prisma.topUp.create({
    data: {
      userId: user.id,
      amount,
      method: "CARD",
      target: topUpTargetFor(user.role),
      provider: provider.name,
      reference: newReference("KRT", false),
    },
  });
  return provider.start(topUp, { user, ...ctx });
}

export async function createBankTransferTopUp(user: { id: string; role: string }, amount: number) {
  await validateAmount(amount);
  const pending = await prisma.topUp.count({ where: { userId: user.id, status: "PENDING", method: "BANK_TRANSFER" } });
  if (pending >= 3) throw new AppError("Onay bekleyen en fazla 3 havale bildiriminiz olabilir.");
  const topUp = await prisma.topUp.create({
    data: { userId: user.id, amount, method: "BANK_TRANSFER", target: topUpTargetFor(user.role), reference: newReference("HVL") },
  });
  await notifyAdmins(prisma, { title: "Yeni havale bildirimi", body: formatTL(amount), href: "/admin/yuklemeler" });
  return topUp;
}

const walletPage = (target: string) => (target === "CREDIT" ? "/isletme/bakiye" : "/musteri/bakiye");

/** Ödeme onaylandığında (sağlayıcı bildirimi veya admin havale onayı) ilgili cüzdanı yükler. */
export async function completeTopUp(topUpId: string, adminNote?: string) {
  await prisma.$transaction(async (tx) => {
    const res = await tx.topUp.updateMany({
      where: { id: topUpId, status: "PENDING" },
      data: { status: "APPROVED", processedAt: new Date(), adminNote: adminNote || null },
    });
    if (res.count === 0) throw new AppError("Bu yükleme zaten işlenmiş.");
    const topUp = await tx.topUp.findUniqueOrThrow({ where: { id: topUpId } });
    await changeWallet(tx, topUp.userId, topUp.target === "CREDIT" ? "CREDIT" : "BALANCE", topUp.amount, {
      type: "TOPUP",
      description: topUp.method === "CARD" ? "Kartla bakiye yükleme" : "Havale/EFT ile bakiye yükleme",
      topUpId,
    });
    await notify(tx, topUp.userId, { title: `${formatTL(topUp.amount)} bakiyene yüklendi`, href: walletPage(topUp.target) });
  });
}

export async function rejectTopUp(topUpId: string, adminNote: string) {
  const res = await prisma.topUp.updateMany({
    where: { id: topUpId, status: "PENDING" },
    data: { status: "REJECTED", processedAt: new Date(), adminNote: adminNote || null },
  });
  if (res.count === 0) throw new AppError("Bu yükleme zaten işlenmiş.");
  const t = await prisma.topUp.findUniqueOrThrow({ where: { id: topUpId } });
  await notify(prisma, t.userId, {
    title: t.method === "CARD" ? "Kartla ödeme tamamlanamadı" : "Havale bildirimin reddedildi",
    body: adminNote,
    href: walletPage(t.target),
  });
}

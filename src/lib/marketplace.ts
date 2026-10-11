import { prisma } from "./db";
import { AppError } from "./errors";
import { getSettings } from "./settings";
import { splitCommission } from "./money";
import { changeBalance, recordPlatformEntry } from "./wallet";

/** İşletme bir talebe teklif verir. Teklif vermek ücretsizdir; komisyon yalnızca tamamlanan işten alınır. */
export async function submitQuote(input: {
  businessId: string;
  requestId: string;
  price: number;
  deliveryDays: number;
  message: string;
}) {
  if (input.price <= 0) throw new AppError("Teklif tutarı sıfırdan büyük olmalı.");
  if (input.deliveryDays < 1 || input.deliveryDays > 90) throw new AppError("Teslim süresi 1-90 gün arası olmalı.");

  const settings = await getSettings();
  return prisma.$transaction(async (tx) => {
    const request = await tx.printRequest.findUnique({
      where: { id: input.requestId },
      include: { _count: { select: { quotes: { where: { status: { in: ["PENDING", "ACCEPTED"] } } } } } },
    });
    if (!request || request.status !== "OPEN") throw new AppError("Bu talep artık teklif kabul etmiyor.");
    if (request.customerId === input.businessId) throw new AppError("Kendi talebinize teklif veremezsiniz.");

    const existing = await tx.quote.findUnique({
      where: { requestId_businessId: { requestId: input.requestId, businessId: input.businessId } },
    });
    if (existing && existing.status === "PENDING") {
      return tx.quote.update({
        where: { id: existing.id },
        data: { price: input.price, deliveryDays: input.deliveryDays, message: input.message },
      });
    }
    if (existing && existing.status !== "WITHDRAWN") throw new AppError("Bu talebe zaten teklif verdiniz.");
    if (request._count.quotes >= settings.maxQuotesPerRequest) {
      throw new AppError("Bu talep en fazla teklif sayısına ulaştı.");
    }
    if (existing) {
      return tx.quote.update({
        where: { id: existing.id },
        data: { price: input.price, deliveryDays: input.deliveryDays, message: input.message, status: "PENDING" },
      });
    }
    return tx.quote.create({ data: { ...input } });
  });
}

export async function withdrawQuote(businessId: string, quoteId: string) {
  const res = await prisma.quote.updateMany({
    where: { id: quoteId, businessId, status: "PENDING" },
    data: { status: "WITHDRAWN" },
  });
  if (res.count === 0) throw new AppError("Teklif geri çekilemedi.");
}

/**
 * Müşteri teklifi kabul eder: tutar müşterinin bakiyesinden düşülür ve sipariş
 * tamamlanana kadar emanette tutulur. Komisyon oranı bu anda siparişe sabitlenir.
 */
export async function acceptQuote(customerId: string, quoteId: string) {
  const { commissionBps } = await getSettings();
  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({ where: { id: quoteId }, include: { request: true } });
    if (!quote || quote.request.customerId !== customerId) throw new AppError("Teklif bulunamadı.");
    if (quote.status !== "PENDING" || quote.request.status !== "OPEN") {
      throw new AppError("Bu teklif artık kabul edilemez.");
    }

    // Aynı anda iki teklifin kabulünü engelle: talep durumunu koşullu güncelle
    const locked = await tx.printRequest.updateMany({
      where: { id: quote.requestId, status: "OPEN" },
      data: { status: "ASSIGNED" },
    });
    if (locked.count === 0) throw new AppError("Bu talep için zaten bir teklif kabul edildi.");

    const { commission, earning } = splitCommission(quote.price, commissionBps);
    const order = await tx.order.create({
      data: {
        requestId: quote.requestId,
        quoteId: quote.id,
        customerId,
        businessId: quote.businessId,
        amount: quote.price,
        commissionBps,
        commissionAmount: commission,
        businessEarning: earning,
      },
    });

    await changeBalance(tx, customerId, -quote.price, {
      type: "ORDER_HOLD",
      description: `Sipariş ödemesi: ${quote.request.title}`,
      orderId: order.id,
    });

    await tx.quote.update({ where: { id: quote.id }, data: { status: "ACCEPTED" } });
    await tx.quote.updateMany({
      where: { requestId: quote.requestId, id: { not: quote.id }, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    return order;
  });
}

export async function markShipped(businessId: string, orderId: string, trackingInfo: string) {
  const res = await prisma.order.updateMany({
    where: { id: orderId, businessId, status: "IN_PROGRESS" },
    data: { status: "SHIPPED", trackingInfo: trackingInfo || null, shippedAt: new Date() },
  });
  if (res.count === 0) throw new AppError("Sipariş kargolandı olarak işaretlenemedi.");
}

/**
 * Siparişi tamamlar: işletmeye (tutar - komisyon) aktarılır, komisyon platform gelirine yazılır.
 * `customerId` verilirse yalnızca o müşterinin siparişi tamamlanabilir.
 */
export async function completeOrder(orderId: string, opts: { customerId?: string; reason: string }) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { request: true } });
    if (!order || (opts.customerId && order.customerId !== opts.customerId)) {
      throw new AppError("Sipariş bulunamadı.");
    }
    const res = await tx.order.updateMany({
      where: { id: orderId, status: { in: ["IN_PROGRESS", "SHIPPED"] } },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (res.count === 0) throw new AppError("Bu sipariş tamamlanamaz.");

    if (order.businessEarning > 0) {
      await changeBalance(tx, order.businessId, order.businessEarning, {
        type: "EARNING",
        description: `Kazanç (${opts.reason}): ${order.request.title}`,
        orderId,
      });
    }
    if (order.commissionAmount > 0) {
      await recordPlatformEntry(tx, order.commissionAmount, {
        type: "COMMISSION",
        description: `Komisyon: ${order.request.title}`,
        orderId,
      });
    }
  });
}

/** Siparişi iptal eder ve emanetteki tutarın tamamını müşteriye iade eder. */
export async function cancelOrder(
  orderId: string,
  opts: { reason: string; businessId?: string; allowShipped?: boolean },
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { request: true } });
    if (!order || (opts.businessId && order.businessId !== opts.businessId)) {
      throw new AppError("Sipariş bulunamadı.");
    }
    const allowed = opts.allowShipped ? ["IN_PROGRESS", "SHIPPED"] : ["IN_PROGRESS"];
    const res = await tx.order.updateMany({
      where: { id: orderId, status: { in: allowed } },
      data: { status: "CANCELLED", cancelReason: opts.reason, cancelledAt: new Date() },
    });
    if (res.count === 0) throw new AppError("Bu sipariş iptal edilemez.");

    await changeBalance(tx, order.customerId, order.amount, {
      type: "ORDER_REFUND",
      description: `İade: ${order.request.title}`,
      orderId,
    });
    await tx.printRequest.update({ where: { id: order.requestId }, data: { status: "CANCELLED" } });
  });
}

/** Kargolandıktan sonra belirli gün içinde onaylanmayan siparişleri otomatik tamamlar. */
export async function autoCompleteShippedOrders(now = new Date()) {
  const { autoCompleteDays } = await getSettings();
  const cutoff = new Date(now.getTime() - autoCompleteDays * 24 * 60 * 60 * 1000);
  const due = await prisma.order.findMany({
    where: { status: "SHIPPED", shippedAt: { lte: cutoff } },
    select: { id: true },
  });
  let completed = 0;
  for (const { id } of due) {
    try {
      await completeOrder(id, { reason: "otomatik onay" });
      completed++;
    } catch (e) {
      console.error(`Otomatik tamamlama başarısız: ${id}`, e);
    }
  }
  return completed;
}

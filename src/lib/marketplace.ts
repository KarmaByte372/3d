import { prisma, type Tx } from "./db";
import { AppError } from "./errors";
import { getSettings } from "./settings";
import { splitCommission } from "./money";
import { changeBalance, changeWallet, recordPlatformEntry } from "./wallet";
import { computeQuoteFee, type FeeRequest, type RatingStats } from "./quote-fee";
import { notify, notifyAdmins } from "./notifications";
import { formatTL } from "./money";

export type FeeSource = "AUTO" | "EARNINGS" | "CREDIT";

/** Atölyenin puan istatistikleri (teklif ücreti indirimi için) */
export async function ratingStats(businessId: string, db: Tx | typeof prisma = prisma): Promise<RatingStats> {
  const [agg, fiveStars] = await Promise.all([
    db.review.aggregate({ where: { businessId }, _avg: { rating: true }, _count: { _all: true } }),
    db.review.count({ where: { businessId, rating: 5 } }),
  ]);
  return { count: agg._count._all, average: agg._avg.rating ?? 0, fiveStars };
}

/** Bu atölyenin bu talebe teklif vermesi için ödeyeceği ücret (önizleme ve tahsilat aynı hesabı kullanır). */
export async function quoteFeeFor(businessId: string, request: FeeRequest, db: Tx | typeof prisma = prisma) {
  const [settings, rating] = await Promise.all([getSettings(), ratingStats(businessId, db)]);
  return computeQuoteFee(request, rating, settings);
}

/**
 * Teklif ücretini tahsil eder. AUTO: önce kazançtan (BALANCE), yetmeyen kısım bakiyeden (CREDIT).
 * EARNINGS / CREDIT: yalnızca seçilen cüzdandan. Ücret iade edilmez.
 */
export async function chargeQuoteFee(tx: Tx, businessId: string, fee: number, source: FeeSource, title: string) {
  if (fee <= 0) return;
  const u = await tx.user.findUniqueOrThrow({ where: { id: businessId }, select: { balance: true, credit: true } });
  let fromEarnings = 0;
  let fromCredit = 0;
  if (source === "EARNINGS") fromEarnings = fee;
  else if (source === "CREDIT") fromCredit = fee;
  else {
    fromEarnings = Math.min(u.balance, fee);
    fromCredit = fee - fromEarnings;
  }
  if (fromEarnings > u.balance || fromCredit > u.credit) {
    const where = source === "EARNINGS" ? "Kazancın" : source === "CREDIT" ? "Bakiyen" : "Kazanç ve bakiyenin toplamı";
    throw new AppError(`Teklif ücreti ${formatTL(fee)}. ${where} yetersiz; Bakiye sayfasından yükleme yapabilirsin.`);
  }
  const description = `Teklif ücreti: ${title}`;
  if (fromEarnings > 0) await changeWallet(tx, businessId, "BALANCE", -fromEarnings, { type: "QUOTE_FEE", description });
  if (fromCredit > 0) await changeWallet(tx, businessId, "CREDIT", -fromCredit, { type: "QUOTE_FEE", description });
  await recordPlatformEntry(tx, fee, { type: "QUOTE_FEE", description });
}

/**
 * İşletme bir talebe teklif verir. Yeni teklifte (veya geri çekilmiş teklifi yeniden açarken) teklif ücreti
 * tahsil edilir; bekleyen teklifi güncellemek ücretsizdir. Tamamlanan işten komisyon ayarı ayrıca uygulanır (varsayılan %0).
 */
export async function submitQuote(input: {
  businessId: string;
  requestId: string;
  price: number;
  deliveryDays: number;
  message: string;
  feeSource?: FeeSource;
  /** Atölyenin ekranda gördüğü ücret; arada değiştiyse teklif gönderilmez */
  expectedFee?: number;
}) {
  if (input.price <= 0) throw new AppError("Teklif tutarı sıfırdan büyük olmalı.");
  if (input.deliveryDays < 1 || input.deliveryDays > 90) throw new AppError("Teslim süresi 1-90 gün arası olmalı.");
  const { feeSource = "AUTO", expectedFee, ...data } = input;

  const settings = await getSettings();
  const business = await prisma.user.findUnique({ where: { id: input.businessId }, select: { identityStatus: true } });
  if (settings.identityRequired === "true" && business?.identityStatus !== "VERIFIED") {
    throw new AppError("Kimlik bilgilerin yönetici tarafından onaylandıktan sonra teklif verebilirsin.");
  }
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

    const fee = await quoteFeeFor(input.businessId, request, tx);
    if (expectedFee !== undefined && expectedFee !== fee.amount) {
      throw new AppError(`Teklif ücreti ${formatTL(fee.amount)} olarak güncellendi. Sayfayı yenileyip tekrar deneyin.`);
    }
    await chargeQuoteFee(tx, input.businessId, fee.amount, feeSource, request.title);
    const feeData = { feeAmount: fee.amount, feeDetail: JSON.stringify(fee.lines) };

    const quote = existing
      ? await tx.quote.update({
          where: { id: existing.id },
          data: { price: input.price, deliveryDays: input.deliveryDays, message: input.message, status: "PENDING", ...feeData },
        })
      : await tx.quote.create({ data: { ...data, ...feeData } });
    await notify(tx, request.customerId, {
      title: `Yeni teklif: ${formatTL(input.price)}`,
      body: request.title,
      href: `/musteri/talep/${request.id}`,
    });
    return quote;
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
    const rejected = await tx.quote.findMany({
      where: { requestId: quote.requestId, id: { not: quote.id }, status: "PENDING" },
      select: { businessId: true },
    });
    await tx.quote.updateMany({
      where: { requestId: quote.requestId, id: { not: quote.id }, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    await notify(tx, quote.businessId, {
      title: "Teklifin kabul edildi, baskıya başlayabilirsin",
      body: `${quote.request.title} · ${formatTL(quote.price)}`,
      href: `/isletme/siparisler/${order.id}`,
    });
    for (const r of rejected) {
      await notify(tx, r.businessId, { title: "Teklifin seçilmedi", body: quote.request.title, href: "/isletme/teklifler" });
    }
    return order;
  });
}

export async function markShipped(businessId: string, orderId: string, trackingInfo: string) {
  await prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, businessId, status: "IN_PROGRESS" },
      data: { status: "SHIPPED", trackingInfo: trackingInfo || null, shippedAt: new Date() },
    });
    if (res.count === 0) throw new AppError("Sipariş kargolandı olarak işaretlenemedi.");
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { request: true } });
    await notify(tx, order.customerId, {
      title: "Siparişin kargoya verildi",
      body: trackingInfo ? `${order.request.title} · ${trackingInfo}` : order.request.title,
      href: `/musteri/siparisler/${orderId}`,
    });
  });
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
    await notify(tx, order.businessId, {
      title: `Sipariş tamamlandı: ${formatTL(order.businessEarning)} bakiyene eklendi`,
      body: order.request.title,
      href: "/isletme/kazanc",
    });
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
    const n = { title: "Sipariş iptal edildi", body: `${order.request.title} · ${opts.reason}` };
    await notify(tx, order.customerId, { ...n, body: `${n.body} · ${formatTL(order.amount)} bakiyene iade edildi`, href: `/musteri/siparisler/${orderId}` });
    await notify(tx, order.businessId, { ...n, href: `/isletme/siparisler/${orderId}` });
  });
}

/** Kargolandıktan sonra belirli gün içinde onaylanmayan siparişleri otomatik tamamlar. */
export async function autoCompleteShippedOrders(now = new Date()) {
  const { autoCompleteDays } = await getSettings();
  const cutoff = new Date(now.getTime() - autoCompleteDays * 24 * 60 * 60 * 1000);
  const due = await prisma.order.findMany({
    where: { status: "SHIPPED", shippedAt: { lte: cutoff }, disputed: false },
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

/** Sipariş tarafları (müşteri ya da işletme) birbirine mesaj yazar. */
export async function sendMessage(orderId: string, senderId: string, body: string) {
  const text = body.trim();
  if (!text) throw new AppError("Mesaj boş olamaz.");
  if (text.length > 2000) throw new AppError("Mesaj en fazla 2000 karakter olabilir.");
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { request: true } });
    if (!order || (order.customerId !== senderId && order.businessId !== senderId)) throw new AppError("Sipariş bulunamadı.");
    const msg = await tx.message.create({ data: { orderId, senderId, body: text } });
    const toCustomer = senderId === order.businessId;
    await notify(tx, toCustomer ? order.customerId : order.businessId, {
      title: toCustomer ? "Atölyeden yeni mesaj" : "Müşteriden yeni mesaj",
      body: text.slice(0, 120),
      href: toCustomer ? `/musteri/siparisler/${orderId}` : `/isletme/siparisler/${orderId}`,
    });
    return msg;
  });
}

/** Müşteri sorun bildirir: otomatik onay durur, admin karar verene kadar ödeme emanette kalır. */
export async function openDispute(customerId: string, orderId: string, reason: string) {
  const text = reason.trim();
  if (text.length < 10) throw new AppError("Sorunu en az 10 karakterle açıklayın.");
  await prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, customerId, status: { in: ["IN_PROGRESS", "SHIPPED"] }, disputed: false },
      data: { disputed: true, disputeReason: text.slice(0, 2000), disputedAt: new Date() },
    });
    if (res.count === 0) throw new AppError("Bu sipariş için sorun bildirilemez.");
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { request: true } });
    await notify(tx, order.businessId, {
      title: "Müşteri sorun bildirdi",
      body: `${order.request.title}: ${text.slice(0, 120)}`,
      href: `/isletme/siparisler/${orderId}`,
    });
    await notifyAdmins(tx, { title: "Yeni anlaşmazlık", body: order.request.title, href: `/admin/siparisler/${orderId}` });
  });
}

/** Tamamlanan sipariş için müşteri bir kez puan ve yorum bırakır. */
export async function submitReview(customerId: string, orderId: string, rating: number, comment: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AppError("Puan 1 ile 5 arasında olmalı.");
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { review: true, request: true } });
  if (!order || order.customerId !== customerId) throw new AppError("Sipariş bulunamadı.");
  if (order.status !== "COMPLETED") throw new AppError("Yalnızca tamamlanan siparişler değerlendirilebilir.");
  if (order.review) throw new AppError("Bu siparişi zaten değerlendirdiniz.");
  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: { orderId, customerId, businessId: order.businessId, rating, comment: comment.trim().slice(0, 1000) },
    });
    await notify(tx, order.businessId, {
      title: `Yeni değerlendirme: ${"★".repeat(rating)}${"☆".repeat(5 - rating)}`,
      body: order.request.title,
      href: `/atolye/${order.businessId}`,
    });
  });
}

/** İşletmelerin ortalama puanı ve değerlendirme sayısı. */
export async function ratingsFor(businessIds: string[]) {
  if (businessIds.length === 0) return new Map<string, { avg: number; count: number }>();
  const rows = await prisma.review.groupBy({
    by: ["businessId"],
    where: { businessId: { in: businessIds } },
    _avg: { rating: true },
    _count: true,
  });
  return new Map(rows.map((r) => [r.businessId, { avg: r._avg.rating ?? 0, count: r._count }]));
}

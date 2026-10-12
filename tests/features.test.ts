import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { adminResetPassword, changePassword } from "@/lib/account";
import {
  acceptQuote,
  autoCompleteShippedOrders,
  completeOrder,
  markShipped,
  openDispute,
  ratingsFor,
  sendMessage,
  submitQuote,
  submitReview,
} from "@/lib/marketplace";
import { hit, isLimited, reset } from "@/lib/rate-limit";
import { makeBusiness, makeCustomer, makeRequest, resetDb } from "./helpers";

const balance = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).balance;

async function setupOrder(price = 50000) {
  const c = await makeCustomer(price * 2);
  const b = await makeBusiness();
  const r = await makeRequest(c.id);
  const q = await submitQuote({ businessId: b.id, requestId: r.id, price, deliveryDays: 3, message: "" });
  const order = await acceptQuote(c.id, q.id);
  return { c, b, order };
}

beforeEach(resetDb);

describe("şifre işlemleri", () => {
  it("mevcut şifre doğruysa değiştirir ve oturum sürümünü artırır", async () => {
    const c = await makeCustomer();
    await prisma.user.update({ where: { id: c.id }, data: { passwordHash: await bcrypt.hash("eskiSifre1", 4) } });
    await expect(changePassword(c.id, "yanlis123", "yeniSifre2")).rejects.toThrow("Mevcut şifre hatalı");
    await expect(changePassword(c.id, "eskiSifre1", "kisa1")).rejects.toThrow("en az 8");
    await expect(changePassword(c.id, "eskiSifre1", "sadeceharf")).rejects.toThrow("rakam");
    const u = await changePassword(c.id, "eskiSifre1", "yeniSifre2");
    expect(u.sessionVersion).toBe(1);
    expect(await bcrypt.compare("yeniSifre2", u.passwordHash)).toBe(true);
  });

  it("admin sıfırlaması geçici şifre üretir, oturumları kapatır ve bildirim gönderir", async () => {
    const c = await makeCustomer();
    const temp = await adminResetPassword(c.id);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: c.id } });
    expect(await bcrypt.compare(temp, u.passwordHash)).toBe(true);
    expect(u.sessionVersion).toBe(1);
    expect(await prisma.notification.count({ where: { userId: c.id } })).toBe(1);
  });
});

describe("giriş deneme sınırı", () => {
  it("pencere içinde sınırı aşınca engeller, süre dolunca açılır", () => {
    const k = "test:limit";
    reset(k);
    for (let i = 0; i < 5; i++) hit(k, 1000, 0);
    expect(isLimited(k, 5, 1000, 500)).toBe(true);
    expect(isLimited(k, 5, 1000, 1500)).toBe(false);
  });
});

describe("anlaşmazlık", () => {
  it("sorun bildirilen sipariş otomatik tamamlanmaz; admin kararı yine işler", async () => {
    const { c, b, order } = await setupOrder();
    await markShipped(b.id, order.id, "");
    await expect(openDispute(c.id, order.id, "kısa")).rejects.toThrow("10");
    await openDispute(c.id, order.id, "Parça kırık geldi, fotoğrafları gönderdim");
    expect(await autoCompleteShippedOrders(new Date(Date.now() + 30 * 86400000))).toBe(0);
    await expect(openDispute(c.id, order.id, "ikinci kez bildirim denemesi")).rejects.toThrow();
    await completeOrder(order.id, { reason: "admin" });
    expect(await balance(b.id)).toBe(40000);
  });
});

describe("değerlendirme", () => {
  it("yalnızca tamamlanan siparişe bir kez yapılabilir ve ortalamaya yansır", async () => {
    const { c, b, order } = await setupOrder();
    await expect(submitReview(c.id, order.id, 5, "")).rejects.toThrow("tamamlanan");
    await completeOrder(order.id, { customerId: c.id, reason: "onay" });
    await expect(submitReview(c.id, order.id, 6, "")).rejects.toThrow("1 ile 5");
    await submitReview(c.id, order.id, 4, "Güzel baskı");
    await expect(submitReview(c.id, order.id, 5, "")).rejects.toThrow("zaten");
    const r = (await ratingsFor([b.id])).get(b.id);
    expect(r).toEqual({ avg: 4, count: 1 });
  });
});

describe("mesajlaşma ve bildirimler", () => {
  it("yalnızca sipariş tarafları yazabilir; karşı taraf bildirim alır", async () => {
    const { c, b, order } = await setupOrder();
    const outsider = await makeCustomer();
    await expect(sendMessage(order.id, outsider.id, "merhaba")).rejects.toThrow("bulunamadı");
    await expect(sendMessage(order.id, c.id, "   ")).rejects.toThrow("boş");
    const before = await prisma.notification.count({ where: { userId: b.id } });
    await sendMessage(order.id, c.id, "Renk siyah olsun lütfen");
    expect(await prisma.notification.count({ where: { userId: b.id } })).toBe(before + 1);
    expect(await prisma.message.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("teklif ve kabul bildirim üretir", async () => {
    const { c, b } = await setupOrder();
    expect(await prisma.notification.count({ where: { userId: c.id, title: { startsWith: "Yeni teklif" } } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: b.id, title: { contains: "kabul edildi" } } })).toBe(1);
  });
});

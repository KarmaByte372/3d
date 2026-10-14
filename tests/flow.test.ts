import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { acceptQuote, autoCompleteShippedOrders, cancelOrder, completeOrder, markShipped, submitQuote } from "@/lib/marketplace";
import { createPayoutBatch, markPayoutFailed, markPayoutPaid } from "@/lib/payouts";
import { completeTopUp, createBankTransferTopUp, rejectTopUp } from "@/lib/payments";
import { updateSettings } from "@/lib/settings";
import { makeBusiness, makeCustomer, makeRequest, resetDb } from "./helpers";

const balance = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).balance;

beforeEach(resetDb);

describe("bakiye yükleme", () => {
  it("havale onaylanınca bakiye artar, iki kez onaylanamaz", async () => {
    const c = await makeCustomer();
    const t = await createBankTransferTopUp(c, 50000);
    expect(await balance(c.id)).toBe(0);
    await completeTopUp(t.id);
    expect(await balance(c.id)).toBe(50000);
    await expect(completeTopUp(t.id)).rejects.toThrow("zaten işlenmiş");
    expect(await balance(c.id)).toBe(50000);
  });
  it("reddedilen havale bakiyeyi değiştirmez", async () => {
    const c = await makeCustomer();
    const t = await createBankTransferTopUp(c, 50000);
    await rejectTopUp(t.id, "Dekont bulunamadı");
    expect(await balance(c.id)).toBe(0);
  });
});

describe("sipariş akışı", () => {
  it("teklif kabulü emanete alır, tamamlanınca (ayarlıysa) %20 komisyon kesilir", async () => {
    await updateSettings({ commissionBps: 2000 });
    const c = await makeCustomer(200000);
    const b = await makeBusiness();
    const r = await makeRequest(c.id);
    const q = await submitQuote({ businessId: b.id, requestId: r.id, price: 100000, deliveryDays: 3, message: "" });

    const order = await acceptQuote(c.id, q.id);
    expect(order.commissionBps).toBe(2000);
    expect(await balance(c.id)).toBe(100000);
    expect(await balance(b.id)).toBe(0);

    await markShipped(b.id, order.id, "Yurtiçi 123");
    await completeOrder(order.id, { customerId: c.id, reason: "müşteri onayı" });
    expect(await balance(b.id)).toBe(80000);

    const commission = await prisma.ledgerEntry.findFirstOrThrow({ where: { type: "COMMISSION" } });
    expect(commission.amount).toBe(20000);
    expect(commission.userId).toBeNull();
    await expect(completeOrder(order.id, { reason: "x" })).rejects.toThrow();
    expect(await balance(b.id)).toBe(80000);
  });

  it("yetersiz bakiyede kabul başarısız olur ve hiçbir şey değişmez", async () => {
    const c = await makeCustomer(1000);
    const b = await makeBusiness();
    const r = await makeRequest(c.id);
    const q = await submitQuote({ businessId: b.id, requestId: r.id, price: 100000, deliveryDays: 3, message: "" });
    await expect(acceptQuote(c.id, q.id)).rejects.toThrow("Yetersiz bakiye");
    expect((await prisma.printRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("OPEN");
    expect(await prisma.order.count()).toBe(0);
  });

  it("ikinci teklif kabul edilemez, diğer teklifler reddedilir", async () => {
    const c = await makeCustomer(500000);
    const b1 = await makeBusiness();
    const b2 = await makeBusiness();
    const r = await makeRequest(c.id);
    const q1 = await submitQuote({ businessId: b1.id, requestId: r.id, price: 100000, deliveryDays: 3, message: "" });
    const q2 = await submitQuote({ businessId: b2.id, requestId: r.id, price: 90000, deliveryDays: 5, message: "" });
    await acceptQuote(c.id, q1.id);
    await expect(acceptQuote(c.id, q2.id)).rejects.toThrow();
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: q2.id } })).status).toBe("REJECTED");
    expect(await balance(c.id)).toBe(400000);
  });

  it("komisyon oranı sipariş anında sabitlenir", async () => {
    await updateSettings({ commissionBps: 2000 });
    const c = await makeCustomer(200000);
    const b = await makeBusiness();
    const r = await makeRequest(c.id);
    const q = await submitQuote({ businessId: b.id, requestId: r.id, price: 100000, deliveryDays: 3, message: "" });
    const order = await acceptQuote(c.id, q.id);
    await updateSettings({ commissionBps: 1000 });
    await completeOrder(order.id, { reason: "test" });
    expect(await balance(b.id)).toBe(80000);
  });

  it("iptal tutarın tamamını müşteriye iade eder", async () => {
    const c = await makeCustomer(100000);
    const b = await makeBusiness();
    const r = await makeRequest(c.id);
    const q = await submitQuote({ businessId: b.id, requestId: r.id, price: 100000, deliveryDays: 3, message: "" });
    const order = await acceptQuote(c.id, q.id);
    await cancelOrder(order.id, { reason: "Malzeme yok", businessId: b.id });
    expect(await balance(c.id)).toBe(100000);
    await expect(completeOrder(order.id, { reason: "x" })).rejects.toThrow();
  });

  it("kargolanan sipariş süre dolunca otomatik tamamlanır", async () => {
    const c = await makeCustomer(100000);
    const b = await makeBusiness();
    const r = await makeRequest(c.id);
    const q = await submitQuote({ businessId: b.id, requestId: r.id, price: 50000, deliveryDays: 3, message: "" });
    const order = await acceptQuote(c.id, q.id);
    await markShipped(b.id, order.id, "");
    expect(await autoCompleteShippedOrders(new Date())).toBe(0);
    expect(await autoCompleteShippedOrders(new Date(Date.now() + 8 * 86400000))).toBe(1);
    expect(await balance(b.id)).toBe(50000); // komisyon %0: tutarın tamamı
  });

  it("teklif sınırına uyulur", async () => {
    await updateSettings({ maxQuotesPerRequest: 1 });
    const c = await makeCustomer();
    const b1 = await makeBusiness();
    const b2 = await makeBusiness();
    const r = await makeRequest(c.id);
    await submitQuote({ businessId: b1.id, requestId: r.id, price: 100, deliveryDays: 3, message: "" });
    await expect(
      submitQuote({ businessId: b2.id, requestId: r.id, price: 100, deliveryDays: 3, message: "" }),
    ).rejects.toThrow("en fazla");
  });
});

describe("çarşamba ödemeleri", () => {
  const wed = new Date("2026-10-14T06:00:00Z");

  it("asgari tutarı aşan ve IBAN'ı olan işletmelere ödeme oluşturur", async () => {
    const ok = await makeBusiness({ balance: 80000 });
    const low = await makeBusiness({ balance: 5000 });
    const noIban = await makeBusiness({ balance: 80000, iban: false });

    const r = await createPayoutBatch(wed);
    expect(r.payoutDate).toBe("2026-10-14");
    expect(r.created).toBe(1);
    expect(await balance(ok.id)).toBe(0);
    expect(await balance(low.id)).toBe(5000);
    expect(await balance(noIban.id)).toBe(80000);

    // Aynı gün tekrar çalıştırmak çift ödeme oluşturmaz
    const again = await createPayoutBatch(wed);
    expect(again.created).toBe(0);
    expect(await prisma.payout.count()).toBe(1);
  });

  it("ödendi işaretlenince parti kapanır; başarısız ödeme bakiyeye döner", async () => {
    const a = await makeBusiness({ balance: 80000 });
    const b = await makeBusiness({ balance: 30000 });
    const { batchId } = await createPayoutBatch(wed);
    const [pa, pb] = await Promise.all([
      prisma.payout.findFirstOrThrow({ where: { businessId: a.id } }),
      prisma.payout.findFirstOrThrow({ where: { businessId: b.id } }),
    ]);
    await markPayoutPaid(pa.id, "DEKONT-1");
    await markPayoutFailed(pb.id, "IBAN hatalı");
    expect(await balance(b.id)).toBe(30000);
    const batch = await prisma.payoutBatch.findUniqueOrThrow({ where: { id: batchId } });
    expect(batch.status).toBe("COMPLETED");
    expect(batch.totalAmount).toBe(80000);
    await expect(markPayoutPaid(pb.id, "")).rejects.toThrow();
  });
});

import crypto from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { saveIntegration } from "@/lib/integrations";
import { acceptQuote, completeOrder, submitQuote, submitReview, withdrawQuote } from "@/lib/marketplace";
import { completeTopUp, createBankTransferTopUp } from "@/lib/payments";
import { buildTokenRequest, callbackHash, verifyCallback } from "@/lib/paytr";
import { computeQuoteFee, invalidTableLine, parseTable } from "@/lib/quote-fee";
import { DEFAULT_SETTINGS, getSettings, updateSettings } from "@/lib/settings";
import { runDataMigrations } from "@/lib/data-migrations";
import { POST as paytrCallback } from "@/app/api/paytr/callback/route";
import { makeBusiness, makeCustomer, makeRequest, resetDb } from "./helpers";

beforeEach(resetDb);

const S = DEFAULT_SETTINGS;
const NEW = { count: 0, average: 0, fiveStars: 0 };
const req = (o: Partial<{ technology: string | null; material: string; city: string; budget: number | null }> = {}) => ({
  technology: "FDM", material: "PLA", city: "Konya", budget: null, ...o,
});
const wallets = async (id: string) => prisma.user.findUniqueOrThrow({ where: { id }, select: { balance: true, credit: true } });

describe("teklif ücreti hesaplama", () => {
  it("kategori × şehir × iş büyüklüğü", () => {
    expect(computeQuoteFee(req(), NEW, S).amount).toBe(2500); // FDM 25 TL, Konya ×1
    expect(computeQuoteFee(req({ city: "İstanbul" }), NEW, S).amount).toBe(3300); // 25 × 1,3 = 32,5 → 33
    expect(computeQuoteFee(req({ city: "istanbul / Kadıköy" }), NEW, S).amount).toBe(3300);
    expect(computeQuoteFee(req({ technology: null, material: "Reçine" }), NEW, S).amount).toBe(4000);
    expect(computeQuoteFee(req({ technology: null, material: "Ahşap" }), NEW, S).amount).toBe(2500); // varsayılan taban
    expect(computeQuoteFee(req({ budget: 30000 }), NEW, S).amount).toBe(2000); // ≤500 TL ×0,8
    expect(computeQuoteFee(req({ budget: 5000000 }), NEW, S).amount).toBe(4500); // >10.000 TL ×1,8
  });

  it("çok 5 yıldız ve yüksek ortalama ücreti düşürür, düşük puan artırır", () => {
    const r = req({ technology: "SLS", city: "İstanbul" }); // 60 × 1,3 = 78 TL
    const fresh = computeQuoteFee(r, NEW, S).amount;
    const few = computeQuoteFee(r, { count: 2, average: 5, fiveStars: 2 }, S).amount; // en az 3 değerlendirme gerekir
    const good = computeQuoteFee(r, { count: 10, average: 4.6, fiveStars: 6 }, S).amount; // %15 + %6
    const great = computeQuoteFee(r, { count: 40, average: 4.9, fiveStars: 38 }, S).amount; // %25 + %15 (tavan %40)
    const bad = computeQuoteFee(r, { count: 5, average: 2.4, fiveStars: 0 }, S).amount; // %20 zam
    expect(fresh).toBe(7800);
    expect(few).toBe(fresh);
    expect(good).toBe(6200);
    expect(great).toBe(4700);
    expect(bad).toBe(9400);
    expect(great).toBeLessThan(good);
    expect(good).toBeLessThan(fresh);
    expect(bad).toBeGreaterThan(fresh);
  });

  it("alt/üst sınır ve kapatma", () => {
    expect(computeQuoteFee(req({ material: "x", technology: null }), NEW, { ...S, quoteFeeDefaultBase: 100 }).amount).toBe(S.quoteFeeMin);
    expect(computeQuoteFee(req({ technology: "DMLS", city: "İstanbul", budget: 9e9 }), NEW, S).amount).toBe(21100); // 90 × 1,3 × 1,8
    expect(computeQuoteFee(req({ technology: "DMLS", city: "İstanbul", budget: 9e9 }), NEW, { ...S, quoteFeeMax: 15000 }).amount).toBe(15000);
    expect(computeQuoteFee(req(), NEW, { ...S, quoteFeeEnabled: "false" }).amount).toBe(0);
  });

  it("tablo biçimi doğrulanır", () => {
    expect(parseTable("A=1\nB = 2,5\nbozuk")).toEqual([{ key: "A", value: 1 }, { key: "B", value: 2.5 }]);
    expect(invalidTableLine("İstanbul=1.3\n\nAnkara=1,2")).toBeNull();
    expect(invalidTableLine("İstanbul=1.3\nAnkara")).toBe("Ankara");
    expect(invalidTableLine("*=1.8")).toBeNull();
  });
});

describe("teklif ücreti tahsilatı", () => {
  it("önce kazançtan, yetmeyen kısım bakiyeden düşülür; platform geliri yazılır", async () => {
    const c = await makeCustomer();
    const b = await makeBusiness({ balance: 1000, credit: 5000 });
    const r = await makeRequest(c.id); // FDM yok, PLA, İstanbul → 25 × 1,3 = 33 TL
    const q = await submitQuote({ businessId: b.id, requestId: r.id, price: 10000, deliveryDays: 2, message: "" });
    expect(q.feeAmount).toBe(3300);
    expect(await wallets(b.id)).toEqual({ balance: 0, credit: 2700 });
    const fees = await prisma.ledgerEntry.findMany({ where: { type: "QUOTE_FEE" }, orderBy: { amount: "asc" } });
    expect(fees.map((f) => [f.userId ? f.wallet : "PLATFORM", f.amount])).toEqual([
      ["CREDIT", -2300],
      ["BALANCE", -1000],
      ["PLATFORM", 3300],
    ]);
  });

  it("seçilen cüzdan yetmezse teklif oluşmaz, hiçbir şey düşmez", async () => {
    const c = await makeCustomer();
    const b = await makeBusiness({ balance: 1000, credit: 5000 });
    const r = await makeRequest(c.id);
    const base = { businessId: b.id, requestId: r.id, price: 10000, deliveryDays: 2, message: "" };
    await expect(submitQuote({ ...base, feeSource: "EARNINGS" })).rejects.toThrow("Kazancın yetersiz");
    expect(await prisma.quote.count()).toBe(0);
    expect(await wallets(b.id)).toEqual({ balance: 1000, credit: 5000 });
    await submitQuote({ ...base, feeSource: "CREDIT" });
    expect(await wallets(b.id)).toEqual({ balance: 1000, credit: 1700 });
  });

  it("toplam yetersizse hata verir", async () => {
    const c = await makeCustomer();
    const b = await makeBusiness({ balance: 0, credit: 1000 });
    const r = await makeRequest(c.id);
    await expect(submitQuote({ businessId: b.id, requestId: r.id, price: 10000, deliveryDays: 2, message: "" })).rejects.toThrow("yetersiz");
  });

  it("güncelleme ücretsiz, geri çekilen teklif iade edilmez ve yeniden açmak tekrar ücretlidir", async () => {
    const c = await makeCustomer();
    const b = await makeBusiness({ credit: 10000 });
    const r = await makeRequest(c.id);
    const base = { businessId: b.id, requestId: r.id, deliveryDays: 2, message: "" };
    const q = await submitQuote({ ...base, price: 10000 });
    await submitQuote({ ...base, price: 9000 });
    expect((await wallets(b.id)).credit).toBe(6700);
    await withdrawQuote(b.id, q.id);
    expect((await wallets(b.id)).credit).toBe(6700);
    await submitQuote({ ...base, price: 9500 });
    expect((await wallets(b.id)).credit).toBe(3400);
  });

  it("ekranda görülen ücret değiştiyse teklif gönderilmez", async () => {
    const c = await makeCustomer();
    const b = await makeBusiness();
    const r = await makeRequest(c.id);
    await expect(
      submitQuote({ businessId: b.id, requestId: r.id, price: 10000, deliveryDays: 2, message: "", expectedFee: 2500 }),
    ).rejects.toThrow("güncellendi");
  });

  it("iyi değerlendirmeler sonraki tekliflerin ücretini düşürür; komisyon %0", async () => {
    const b = await makeBusiness({ credit: 1000000 });
    for (let i = 0; i < 3; i++) {
      const c = await makeCustomer(100000);
      const r = await makeRequest(c.id);
      const q = await submitQuote({ businessId: b.id, requestId: r.id, price: 10000, deliveryDays: 2, message: "" });
      expect(q.feeAmount).toBe(3300);
      const o = await acceptQuote(c.id, q.id);
      await completeOrder(o.id, { customerId: c.id, reason: "test" });
      await submitReview(c.id, o.id, 5, "Harika");
    }
    // komisyon yok: 3 × 100 TL kazanç; 2. ve 3. teklifin ücreti (otomatik) kazançtan düşüldü
    expect((await wallets(b.id)).balance).toBe(30000 - 2 * 3300);
    const c = await makeCustomer();
    const r = await makeRequest(c.id);
    const q = await submitQuote({ businessId: b.id, requestId: r.id, price: 10000, deliveryDays: 2, message: "", feeSource: "CREDIT" });
    expect(q.feeAmount).toBe(2300); // 32,5 × (1 − %25 − %3) = 23,4 → 23 TL
  });
});

describe("yükleme hedefi", () => {
  it("atölyenin havalesi teklif bakiyesine, müşterininki bakiyeye gider", async () => {
    const b = await makeBusiness({ credit: 0 });
    const c = await makeCustomer();
    const tb = await createBankTransferTopUp(b, 50000);
    const tc = await createBankTransferTopUp(c, 50000);
    expect(tb.target).toBe("CREDIT");
    await completeTopUp(tb.id);
    await completeTopUp(tc.id);
    expect(await wallets(b.id)).toEqual({ balance: 0, credit: 50000 });
    expect((await wallets(c.id)).balance).toBe(50000);
    const e = await prisma.ledgerEntry.findFirstOrThrow({ where: { userId: b.id } });
    expect([e.wallet, e.balanceAfter]).toEqual(["CREDIT", 50000]);
  });
});

describe("PayTR", () => {
  const key = "KEY123";
  const salt = "SALT456";

  it("jeton imzası belgelenen sırayla üretilir", () => {
    const f = buildTokenRequest({
      merchantId: "100001", merchantKey: key, merchantSalt: salt, userIp: "1.2.3.4", merchantOid: "KRTABC",
      email: "a@b.tr", paymentAmount: 12345, basket: [["Bakiye", "123.45", 1]], maxInstallment: 0, testMode: true,
      userName: "Ali", userAddress: "Türkiye", userPhone: "05321112233", okUrl: "http://x/ok", failUrl: "http://x/fail",
    });
    const basket = Buffer.from(JSON.stringify([["Bakiye", "123.45", 1]])).toString("base64");
    const expected = crypto.createHmac("sha256", key)
      .update("100001" + "1.2.3.4" + "KRTABC" + "a@b.tr" + "12345" + basket + "1" + "0" + "TL" + "1" + salt)
      .digest("base64");
    expect(f.paytr_token).toBe(expected);
    expect(f.user_basket).toBe(basket);
    expect([f.no_installment, f.test_mode, f.currency, f.payment_amount]).toEqual(["1", "1", "TL", "12345"]);
  });

  it("bildirim imzası doğrulanır", () => {
    const hash = callbackHash("KRTABC", "success", "12345", key, salt);
    expect(verifyCallback({ merchant_oid: "KRTABC", status: "success", total_amount: "12345", hash }, key, salt)).toBe(true);
    expect(verifyCallback({ merchant_oid: "KRTABC", status: "success", total_amount: "99999", hash }, key, salt)).toBe(false);
    expect(verifyCallback({ merchant_oid: "KRTABC", status: "success", total_amount: "12345", hash }, key, "")).toBe(false);
  });

  it("bildirim uç noktası imzalı ödemeyi bir kez yükler, sahte bildirimi reddeder", async () => {
    await saveIntegration(
      { paytrEnabled: "true", paytrMerchantId: "100001" },
      { paytrMerchantKey: { value: key, clear: false }, paytrMerchantSalt: { value: salt, clear: false } },
    );
    const b = await makeBusiness({ credit: 0 });
    const t = await prisma.topUp.create({
      data: { userId: b.id, amount: 20000, method: "CARD", target: "CREDIT", provider: "paytr", reference: "KRT0011223344" },
    });
    const post = (status: string, hash: string) => {
      const body = new URLSearchParams({ merchant_oid: t.reference, status, total_amount: "20000", hash, payment_type: "card" });
      return paytrCallback(new Request("http://x/api/paytr/callback", { method: "POST", body }));
    };
    const bad = await post("success", "sahte");
    expect(bad.status).toBe(400);
    expect((await wallets(b.id)).credit).toBe(0);

    const good = callbackHash(t.reference, "success", "20000", key, salt);
    expect(await (await post("success", good)).text()).toBe("OK");
    expect(await (await post("success", good)).text()).toBe("OK"); // tekrar gelen bildirim
    expect((await wallets(b.id)).credit).toBe(20000);
    expect((await prisma.topUp.findUniqueOrThrow({ where: { id: t.id } })).status).toBe("APPROVED");
  });

  it("başarısız ödeme bildirimi yüklemeyi reddeder", async () => {
    await saveIntegration(
      { paytrEnabled: "true", paytrMerchantId: "100001" },
      { paytrMerchantKey: { value: key, clear: false }, paytrMerchantSalt: { value: salt, clear: false } },
    );
    const c = await makeCustomer();
    const t = await prisma.topUp.create({ data: { userId: c.id, amount: 20000, method: "CARD", provider: "paytr", reference: "KRT99" } });
    const body = new URLSearchParams({
      merchant_oid: "KRT99", status: "failed", total_amount: "20000", failed_reason_msg: "Yetersiz limit",
      hash: callbackHash("KRT99", "failed", "20000", key, salt),
    });
    const res = await paytrCallback(new Request("http://x", { method: "POST", body }));
    expect(await res.text()).toBe("OK");
    const fresh = await prisma.topUp.findUniqueOrThrow({ where: { id: t.id } });
    expect(fresh.status).toBe("REJECTED");
    expect(fresh.adminNote).toContain("Yetersiz limit");
    expect((await wallets(c.id)).balance).toBe(0);
  });
});

describe("veri güncellemesi", () => {
  it("kayıtlı %20 komisyonu bir kez %0'a çeker", async () => {
    await updateSettings({ commissionBps: 2000 });
    await runDataMigrations();
    expect((await getSettings()).commissionBps).toBe(0);
    await updateSettings({ commissionBps: 500 });
    await runDataMigrations();
    expect((await getSettings()).commissionBps).toBe(500);
  });
});

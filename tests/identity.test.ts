import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { approveIdentity, maskedTcknOf, rejectIdentity, submitIdentity } from "@/lib/identity";
import { submitQuote } from "@/lib/marketplace";
import { getSettings, updateSettings } from "@/lib/settings";
import { isIdentityRequired } from "@/lib/identity";
import { isValidTckn, maskTckn } from "@/lib/tckn";
import { fakeTckn, makeBusiness, makeCustomer, makeRequest, resetDb } from "./helpers";

beforeEach(resetDb);

const fresh = async (role: "CUSTOMER" | "BUSINESS") => {
  const u = role === "CUSTOMER" ? await makeCustomer() : await makeBusiness();
  return prisma.user.update({ where: { id: u.id }, data: { identityStatus: "NONE" } });
};
const input = (tckn: string, birthYear = 1990) => ({ tckn, firstName: "ayşe  nur", lastName: "çelik", birthYear });

describe("TC kimlik algoritması", () => {
  it("bilinen geçerli numarayı kabul eder, bozukları reddeder", () => {
    expect(isValidTckn("10000000146")).toBe(true);
    expect(isValidTckn("10000000147")).toBe(false); // son hane yanlış
    expect(isValidTckn("00000000146")).toBe(false); // 0 ile başlayamaz
    expect(isValidTckn("1000000014")).toBe(false); // 10 hane
    for (let i = 0; i < 50; i++) expect(isValidTckn(fakeTckn(i * 7919))).toBe(true);
  });
  it("maskeler", () => expect(maskTckn("10000000146")).toBe("100******46"));
});

describe("kimlik gönderimi", () => {
  it("müşteri algoritma kontrolüyle anında doğrulanır; numara şifreli ve maskeli", async () => {
    const u = await fresh("CUSTOMER");
    const r = await submitIdentity(u.id, input("10000000146"));
    expect(r.identityStatus).toBe("VERIFIED");
    expect(r.identityMethod).toBe("FORMAT");
    expect(r.legalFirstName).toBe("AYŞE NUR");
    expect(r.legalLastName).toBe("ÇELİK");
    expect(r.tcknEnc).not.toContain("10000000146");
    expect(maskedTcknOf(r)).toBe("100******46");
    await expect(submitIdentity(u.id, input("10000000146"))).rejects.toThrow("zaten");
  });

  it("geçersiz numara, 18 yaş altı ve hatalı ad reddedilir", async () => {
    const u = await fresh("CUSTOMER");
    const now = new Date("2026-10-12");
    await expect(submitIdentity(u.id, input("12345678901"), now)).rejects.toThrow("geçersiz");
    await expect(submitIdentity(u.id, input("10000000146", 2010), now)).rejects.toThrow("18");
    await expect(submitIdentity(u.id, { ...input("10000000146"), firstName: "A1" }, now)).rejects.toThrow();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).identityStatus).toBe("NONE");
  });

  it("aynı numara aynı rolde ikinci hesapta kullanılamaz, farklı rolde kullanılabilir", async () => {
    const a = await fresh("CUSTOMER");
    const b = await fresh("CUSTOMER");
    const w = await fresh("BUSINESS");
    await submitIdentity(a.id, input("10000000146"));
    await expect(submitIdentity(b.id, input("10000000146"))).rejects.toThrow("başka bir hesapta");
    await expect(submitIdentity(w.id, input("10000000146"))).resolves.toBeTruthy();
  });

  it("varsayılan kapalı: kimliği olmayan atölye teklif verebilir", async () => {
    expect((await getSettings()).identityRequired).toBe("false");
    expect(await isIdentityRequired()).toBe(false);
    const w = await fresh("BUSINESS");
    const c = await makeCustomer();
    const req = await makeRequest(c.id);
    await expect(submitQuote({ businessId: w.id, requestId: req.id, price: 1000, deliveryDays: 2, message: "" })).resolves.toBeTruthy();
  });

  it("açıkken atölye onaya düşer, onaylanana kadar teklif veremez; admin bildirim alır", async () => {
    await updateSettings({ identityRequired: "true" });
    const admin = await prisma.user.create({ data: { email: "a@x.tr", passwordHash: "x", name: "A", role: "ADMIN" } });
    const w = await fresh("BUSINESS");
    const c = await makeCustomer();
    const req = await makeRequest(c.id);
    const r = await submitIdentity(w.id, input(fakeTckn(42)));
    expect(r.identityStatus).toBe("PENDING");
    expect(await prisma.notification.count({ where: { userId: admin.id } })).toBe(1);
    await expect(submitQuote({ businessId: w.id, requestId: req.id, price: 1000, deliveryDays: 2, message: "" })).rejects.toThrow("onaylandıktan sonra");
    await approveIdentity(w.id);
    await expect(submitQuote({ businessId: w.id, requestId: req.id, price: 1000, deliveryDays: 2, message: "" })).resolves.toBeTruthy();
  });

  it("red: bilgiler silinir, numara serbest kalır, kullanıcı yeniden gönderebilir", async () => {
    const w = await fresh("BUSINESS");
    const t = fakeTckn(99);
    await submitIdentity(w.id, input(t));
    await rejectIdentity(w.id, "Ad kimlikle uyuşmuyor");
    const r = await prisma.user.findUniqueOrThrow({ where: { id: w.id } });
    expect(r.identityStatus).toBe("REJECTED");
    expect(r.tcknEnc).toBeNull();
    expect(r.identityNote).toBe("Ad kimlikle uyuşmuyor");
    const w2 = await fresh("BUSINESS");
    await expect(submitIdentity(w2.id, input(t))).resolves.toBeTruthy();
  });
});

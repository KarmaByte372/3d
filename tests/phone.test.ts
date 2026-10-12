import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { issueCode, verifyCode } from "@/lib/otp";
import { formatPhone, maskPhone, normalizeTrMobile } from "@/lib/phone";
import {
  confirmVerification,
  requestPasswordReset,
  requestPhoneChange,
  resetPasswordWithCode,
} from "@/lib/phone-verify";
import { verifySession, signSession } from "@/lib/session";
import { makeCustomer, resetDb } from "./helpers";

/** "log" SMS sağlayıcısının yazdığı son kodu yakalar. */
let logSpy: ReturnType<typeof vi.spyOn>;
function lastCode(): string {
  const calls = logSpy.mock.calls.map((c: unknown[]) => String(c[0])).filter((l: string) => l.startsWith("[sms:log]"));
  const m = calls.at(-1)?.match(/: (\d{6})\./);
  if (!m) throw new Error("SMS kodu bulunamadı");
  return m[1];
}
const wrong = (c: string) => (c === "000000" ? "111111" : "000000");

beforeEach(async () => {
  await resetDb();
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => logSpy.mockRestore());

describe("telefon biçimi", () => {
  it("farklı yazımları 10 haneye çevirir", () => {
    for (const v of ["0532 123 45 67", "+90 532 123 4567", "905321234567", "5321234567", "(0532) 123-45-67"]) {
      expect(normalizeTrMobile(v)).toBe("5321234567");
    }
  });
  it("cep olmayan numaraları reddeder", () => {
    expect(normalizeTrMobile("0212 123 45 67")).toBeNull();
    expect(normalizeTrMobile("0850 123 45 67")).toBeNull();
    expect(normalizeTrMobile("12345")).toBeNull();
  });
  it("gösterim ve maskeleme", () => {
    expect(formatPhone("5321234567")).toBe("0532 123 45 67");
    expect(maskPhone("5321234567")).toBe("0532 *** ** 67");
  });
});

describe("SMS kodu", () => {
  const phone = "5321234567";

  it("doğru kod bir kez kullanılabilir; SMS'te Türkçe karakter olmaz", async () => {
    await issueCode({ phone, purpose: "VERIFY", ip: "1.1.1.1" });
    const sms = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(sms).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);
    const code = lastCode();
    await verifyCode({ phone, purpose: "VERIFY", code });
    await expect(verifyCode({ phone, purpose: "VERIFY", code })).rejects.toThrow("geçersiz");
  });

  it("5 hatalı denemeden sonra kod geçersizleşir", async () => {
    await issueCode({ phone, purpose: "VERIFY", ip: "1.1.1.1" });
    const code = lastCode();
    for (let i = 0; i < 4; i++) await expect(verifyCode({ phone, purpose: "VERIFY", code: wrong(code) })).rejects.toThrow("Kalan deneme");
    await expect(verifyCode({ phone, purpose: "VERIFY", code: wrong(code) })).rejects.toThrow("Çok fazla");
    await expect(verifyCode({ phone, purpose: "VERIFY", code })).rejects.toThrow("geçersiz");
  });

  it("60 saniye dolmadan yeni kod gönderilmez; süresi dolan kod reddedilir", async () => {
    await issueCode({ phone, purpose: "VERIFY", ip: "1.1.1.1" });
    await expect(issueCode({ phone, purpose: "VERIFY", ip: "1.1.1.1" })).rejects.toThrow("saniye");
    const code = lastCode();
    await prisma.phoneCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(verifyCode({ phone, purpose: "VERIFY", code })).rejects.toThrow("süresi");
  });

  it("amaçlar birbirine karışmaz", async () => {
    await issueCode({ phone, purpose: "VERIFY", ip: "1.1.1.1" });
    await expect(verifyCode({ phone, purpose: "RESET", code: lastCode() })).rejects.toThrow();
  });

  it("numara başına saatlik gönderim sınırı uygulanır", async () => {
    for (let i = 0; i < 5; i++) {
      await prisma.phoneCode.create({
        data: { phone, purpose: "VERIFY", codeHash: "x", ip: "9.9.9.9", expiresAt: new Date(), createdAt: new Date(Date.now() - 120_000) },
      });
    }
    await expect(issueCode({ phone, purpose: "VERIFY", ip: "2.2.2.2" })).rejects.toThrow("Çok fazla kod");
  });
});

describe("hesap doğrulama ve telefon değişimi", () => {
  it("doğrulanmış numara ikinci hesapta doğrulanamaz", async () => {
    const a = await makeCustomer();
    const b = await makeCustomer();
    await prisma.user.update({ where: { id: a.id }, data: { phone: "5320000001", phoneVerifiedAt: new Date() } });
    await expect(requestPhoneChange(b.id, "0532 000 00 01", "1.1.1.1")).rejects.toThrow("başka bir hesapta");
  });

  it("yeni numara doğrulanana kadar eski numara geçerli kalır", async () => {
    const u = await makeCustomer();
    await prisma.user.update({ where: { id: u.id }, data: { phone: "5320000001", phoneVerifiedAt: new Date() } });
    await requestPhoneChange(u.id, "05320000002", "1.1.1.1");
    let fresh = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(fresh.phone).toBe("5320000001");
    expect(fresh.pendingPhone).toBe("5320000002");
    await confirmVerification(u.id, lastCode());
    fresh = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(fresh.phone).toBe("5320000002");
    expect(fresh.pendingPhone).toBeNull();
  });

  it("kayıtlı olmayan numaraya sıfırlama kodu gitmez ama hata da dönmez", async () => {
    await expect(requestPasswordReset("05329999999", "1.1.1.1")).resolves.toBe("5329999999");
    expect(await prisma.phoneCode.count()).toBe(0);
  });

  it("SMS koduyla şifre sıfırlanır ve oturumlar kapanır", async () => {
    const u = await makeCustomer();
    await prisma.user.update({ where: { id: u.id }, data: { phone: "5320000003", phoneVerifiedAt: new Date() } });
    await requestPasswordReset("0532 000 00 03", "1.1.1.1");
    await expect(resetPasswordWithCode("05320000003", lastCode(), "zayif")).rejects.toThrow("en az 8");
    await resetPasswordWithCode("05320000003", lastCode(), "YeniSifre7");
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await bcrypt.compare("YeniSifre7", fresh.passwordHash)).toBe(true);
    expect(fresh.sessionVersion).toBe(1);
  });
});

describe("oturum belirteci", () => {
  it("IP bilgisini taşır", async () => {
    const t = await signSession({ sub: "u1", role: "CUSTOMER", ver: 2, ip: "85.1.2.3" });
    expect(await verifySession(t)).toEqual({ sub: "u1", role: "CUSTOMER", ver: 2, ip: "85.1.2.3" });
  });
});

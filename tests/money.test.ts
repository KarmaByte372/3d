import { describe, expect, it } from "vitest";
import { parseTL, splitCommission } from "@/lib/money";
import { istanbulDate, isWednesday, nextWednesday } from "@/lib/dates";

describe("parseTL", () => {
  it("Türkçe ve noktalı biçimleri kuruşa çevirir", () => {
    expect(parseTL("1.250,50")).toBe(125050);
    expect(parseTL("1250.5")).toBe(125050);
    expect(parseTL("1250")).toBe(125000);
    expect(parseTL("99,9 TL")).toBe(9990);
    expect(parseTL("1.000")).toBe(100000);
    expect(parseTL("12.500.000")).toBe(1250000000);
    expect(parseTL("10.5")).toBe(1050);
  });
  it("geçersiz girdiyi reddeder", () => {
    expect(parseTL("")).toBeNull();
    expect(parseTL("abc")).toBeNull();
    expect(parseTL("-5")).toBeNull();
    expect(parseTL("1,234")).toBeNull();
  });
});

describe("splitCommission", () => {
  it("%20 komisyonu ayırır", () => {
    expect(splitCommission(100000, 2000)).toEqual({ commission: 20000, earning: 80000 });
  });
  it("kuruşu yuvarlar ve toplam korunur", () => {
    const r = splitCommission(333, 2000);
    expect(r.commission + r.earning).toBe(333);
    expect(r.commission).toBe(67);
  });
  it("geçersiz oranı reddeder", () => {
    expect(() => splitCommission(100, 10001)).toThrow();
  });
});

describe("tarih yardımcıları (İstanbul)", () => {
  it("UTC gece yarısına yakın anları İstanbul gününe göre değerlendirir", () => {
    // 2026-10-13 22:30 UTC = 2026-10-14 01:30 İstanbul (çarşamba)
    const d = new Date("2026-10-13T22:30:00Z");
    expect(istanbulDate(d)).toBe("2026-10-14");
    expect(isWednesday(d)).toBe(true);
  });
  it("bir sonraki çarşambayı bulur", () => {
    expect(nextWednesday(new Date("2026-10-11T10:00:00Z"))).toBe("2026-10-14");
    expect(nextWednesday(new Date("2026-10-14T10:00:00Z"))).toBe("2026-10-14");
  });
});

import { normalizeTrIban } from "@/lib/iban";

describe("normalizeTrIban", () => {
  it("geçerli IBAN'ı kabul eder ve boşlukları temizler", () => {
    expect(normalizeTrIban("tr33 0006 1005 1978 6457 8413 26")).toBe("TR330006100519786457841326");
  });
  it("hatalı kontrol basamağını reddeder", () => {
    expect(normalizeTrIban("TR340006100519786457841326")).toBeNull();
    expect(normalizeTrIban("DE89370400440532013000")).toBeNull();
  });
});

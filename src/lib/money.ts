/** Tüm tutarlar kuruş cinsinden tamsayıdır. Oranlar baz puandır (10000 bps = %100). */

export function formatTL(kurus: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(kurus / 100);
}

export function formatBps(bps: number): string {
  return `%${(bps / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;
}

/** "1.250,50", "1250.5", "1250" gibi girdileri kuruşa çevirir. Geçersizse null döner. */
export function parseTL(input: string): number | null {
  const s = input.trim().replace(/\s|₺|TL/gi, "");
  if (!s) return null;
  let normalized: string;
  if (s.includes(",")) {
    // Türkçe biçim: nokta binlik ayırıcı, virgül ondalık
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.000" veya "12.500.000": yalnızca binlik ayırıcılı tam sayı
    normalized = s.replace(/\./g, "");
  } else {
    normalized = s;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, frac = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Sipariş tutarını platform komisyonu ve işletme kazancı olarak böler. */
export function splitCommission(amount: number, commissionBps: number) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error("Geçersiz tutar");
  if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10000) {
    throw new Error("Geçersiz komisyon oranı");
  }
  const commission = Math.round((amount * commissionBps) / 10000);
  return { commission, earning: amount - commission };
}

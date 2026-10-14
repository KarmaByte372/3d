import type { Settings } from "./settings";
import { formatTL } from "./money";

/**
 * Teklif ücreti motoru (kural tabanlı, Armut'taki "teklif kredisi" mantığı):
 *
 *   ücret = kategori tabanı × şehir çarpanı × iş büyüklüğü çarpanı × (1 − puan indirimi)
 *
 * - Kategori: talebin teknolojisi (FDM, SLA, SLS…) veya malzemesi (Reçine, Metal…)
 * - Şehir: büyük şehirlerde rekabet ve iş değeri yüksek olduğu için çarpan büyük
 * - İş büyüklüğü: müşterinin girdiği bütçe aralığı (bütçe yoksa 1)
 * - Puan: çok sayıda 5 yıldız alan ve ortalaması yüksek atölye daha az öder; düşük puanlı daha çok öder
 *
 * Sonuç alt/üst sınıra kırpılır ve tam liraya yuvarlanır. Tüm tablolar admin → Ayarlar'dan değiştirilir.
 */

export type FeeRequest = { technology: string | null; material: string; city: string; budget: number | null };
export type RatingStats = { count: number; average: number; fiveStars: number };
export type FeeLine = { label: string; value: string };
export type QuoteFee = { amount: number; lines: FeeLine[]; discountPct: number };

type FeeSettings = Pick<
  Settings,
  | "quoteFeeEnabled"
  | "quoteFeeMin"
  | "quoteFeeMax"
  | "quoteFeeDefaultBase"
  | "quoteFeeCategories"
  | "quoteFeeCities"
  | "quoteFeeBudgets"
  | "quoteFeeRatingTiers"
  | "quoteFeeFiveStarStep"
  | "quoteFeeFiveStarCap"
  | "quoteFeeMinReviews"
  | "quoteFeeMaxDiscount"
>;

const norm = (s: string) => s.trim().toLocaleLowerCase("tr-TR");

/** "anahtar=değer" satırlarını okur. Hatalı satırları atlar. */
export function parseTable(text: string): { key: string; value: number }[] {
  return String(text)
    .split(/\r?\n|;/)
    .map((line) => line.split("="))
    .filter((p) => p.length === 2 && p[0].trim() && Number.isFinite(Number(p[1].trim().replace(",", "."))))
    .map(([k, v]) => ({ key: k.trim(), value: Number(v.trim().replace(",", ".")) }));
}

/** Tablonun geçerli olup olmadığını kontrol eder (admin kaydederken). Hatalı satırı döndürür. */
export function invalidTableLine(text: string): string | null {
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const p = line.split("=");
    if (p.length !== 2 || !p[0].trim() || !Number.isFinite(Number(p[1].trim().replace(",", ".")))) return line.trim();
  }
  return null;
}

const fmtNum = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });

export function computeQuoteFee(req: FeeRequest, rating: RatingStats, s: FeeSettings): QuoteFee {
  if (s.quoteFeeEnabled !== "true") return { amount: 0, lines: [{ label: "Teklif ücreti", value: "Ücretsiz" }], discountPct: 0 };
  const lines: FeeLine[] = [];

  // 1) Kategori tabanı
  const cats = parseTable(s.quoteFeeCategories);
  const candidates = [req.technology, req.material].filter(Boolean).map((c) => norm(c!));
  let base = s.quoteFeeDefaultBase;
  let category = "Genel";
  outer: for (const c of candidates) {
    for (const row of cats) {
      const k = norm(row.key);
      if (c === k || c.includes(k)) {
        base = Math.round(row.value * 100);
        category = row.key;
        break outer;
      }
    }
  }
  lines.push({ label: `Kategori tabanı (${category})`, value: formatTL(base) });

  // 2) Şehir
  const city = norm(req.city);
  const cityRow = parseTable(s.quoteFeeCities).find((r) => city === norm(r.key) || city.startsWith(norm(r.key)));
  const cityFactor = cityRow?.value ?? 1;
  lines.push({ label: `Konum (${req.city})`, value: `×${fmtNum(cityFactor)}` });

  // 3) İş büyüklüğü (bütçe)
  let sizeFactor = 1;
  let sizeLabel = "bütçe belirtilmemiş";
  if (req.budget && req.budget > 0) {
    const tiers = String(s.quoteFeeBudgets)
      .split(/\r?\n|;/)
      .map((line) => line.split("="))
      .filter((p) => p.length === 2)
      .map(([k, v]) => ({ max: k.trim() === "*" ? Infinity : Number(k.trim()) * 100, factor: Number(v.trim().replace(",", ".")) }))
      .filter((t) => !Number.isNaN(t.max) && Number.isFinite(t.factor))
      .sort((a, b) => a.max - b.max);
    const tier = tiers.find((t) => req.budget! <= t.max) ?? tiers[tiers.length - 1];
    if (tier) {
      sizeFactor = tier.factor;
      sizeLabel = `bütçe ${formatTL(req.budget)}`;
    }
  }
  lines.push({ label: `İş büyüklüğü (${sizeLabel})`, value: `×${fmtNum(sizeFactor)}` });

  // 4) Değerlendirme indirimi
  let discount = 0;
  if (rating.count >= s.quoteFeeMinReviews) {
    const tiers = parseTable(s.quoteFeeRatingTiers)
      .map((t) => ({ min: Number(t.key.replace(",", ".")), pct: t.value }))
      .filter((t) => Number.isFinite(t.min))
      .sort((a, b) => b.min - a.min);
    const tier = tiers.find((t) => rating.average >= t.min);
    const avgPct = tier?.pct ?? 0;
    const starPct = Math.min(rating.fiveStars * s.quoteFeeFiveStarStep, s.quoteFeeFiveStarCap);
    discount = Math.min(avgPct + (avgPct >= 0 ? starPct : 0), s.quoteFeeMaxDiscount);
    lines.push({
      label: `Puan (${fmtNum(Math.round(rating.average * 10) / 10)}★ · ${rating.count} değerlendirme, ${rating.fiveStars} tane 5★)`,
      value: discount === 0 ? "—" : discount > 0 ? `−%${fmtNum(discount)}` : `+%${fmtNum(-discount)}`,
    });
  } else {
    lines.push({
      label: `Puan indirimi (${s.quoteFeeMinReviews} değerlendirmeden sonra başlar, şu an ${rating.count})`,
      value: "—",
    });
  }

  const raw = base * cityFactor * sizeFactor * (1 - discount / 100);
  let amount = Math.round(raw / 100) * 100; // tam lira
  const min = Math.min(s.quoteFeeMin, s.quoteFeeMax);
  if (amount < min) {
    amount = min;
    lines.push({ label: "Alt sınır uygulandı", value: formatTL(min) });
  } else if (amount > s.quoteFeeMax) {
    amount = s.quoteFeeMax;
    lines.push({ label: "Üst sınır uygulandı", value: formatTL(s.quoteFeeMax) });
  }
  return { amount, lines, discountPct: discount };
}

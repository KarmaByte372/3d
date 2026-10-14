import { prisma } from "./db";

/**
 * Gelir modeli (Armut gibi): atölyeler teklif verirken ücret öder, tamamlanan işten komisyon alınmaz (%0).
 * Teklif ücreti konum, kategori, iş büyüklüğü ve atölyenin değerlendirmelerine göre hesaplanır (bkz. quote-fee.ts).
 * Hepsi admin panelinden değiştirilebilir.
 */
export const DEFAULT_SETTINGS = {
  /** TC kimlik doğrulaması zorunlu mu ("true"/"false"); admin → Entegrasyonlar'dan açılır */
  identityRequired: "false",
  /** IP değişince oturumu kapatma: strict (birebir IP) | subnet (aynı ağ bloğu) | off */
  sessionIpMode: "subnet",
  /** Sitenin/markanın görünen adı (logo, başlıklar, SMS metinleri) */
  siteName: "Baskı3D",
  /** Yasal metinlerde geçen şirket bilgileri */
  companyTitle: "Digituva Yazılım",
  companyAddress: "",
  companyTaxOffice: "",
  companyTaxNumber: "",
  companyMersis: "",
  companyEmail: "",
  companyPhone: "",
  companyKep: "",
  /** Tamamlanan işten alınan komisyon (bps). Varsayılan %0: gelir teklif ücretlerinden gelir. */
  commissionBps: 0,
  /** --- Teklif ücreti --- ("true"/"false") */
  quoteFeeEnabled: "true",
  /** Alt ve üst sınır (kuruş) */
  quoteFeeMin: 1000,
  quoteFeeMax: 30000,
  /** Kategori tablosunda bulunmayan işler için taban ücret (kuruş) */
  quoteFeeDefaultBase: 2500,
  /** Kategori taban ücretleri (TL). Önce talebin teknolojisi, sonra malzemesi aranır. */
  quoteFeeCategories: "FDM=25\nSLA=40\nReçine=40\nSLS=60\nMJF=60\nDMLS=90\nMetal=90",
  /** Şehir çarpanları; listede olmayan şehirler 1 */
  quoteFeeCities: "İstanbul=1.3\nAnkara=1.2\nİzmir=1.2\nBursa=1.1\nAntalya=1.1\nKocaeli=1.1",
  /** Müşteri bütçesine göre iş büyüklüğü çarpanı: "bütçe üst sınırı TL=çarpan", * = üstü. Bütçe yoksa 1. */
  quoteFeeBudgets: "500=0.8\n2000=1\n10000=1.4\n*=1.8",
  /** Ortalama puana göre indirim (%): "en az puan=indirim". Eksi değer zam demektir. */
  quoteFeeRatingTiers: "4.8=25\n4.5=15\n4=5\n3=0\n0=-20",
  /** Her 5 yıldızlı değerlendirme için ek indirim (%) ve bu ek indirimin üst sınırı (%) */
  quoteFeeFiveStarStep: 1,
  quoteFeeFiveStarCap: 15,
  /** Puan indirimi/zammı için gereken en az değerlendirme sayısı */
  quoteFeeMinReviews: 3,
  /** Toplam indirimin üst sınırı (%) */
  quoteFeeMaxDiscount: 40,
  /** Çarşamba ödemesine dahil olmak için gereken asgari bakiye (kuruş) */
  minPayout: 10000,
  /** Kargolanan sipariş müşteri onaylamazsa kaç gün sonra otomatik tamamlanır */
  autoCompleteDays: 7,
  /** Bir talebe gönderilebilecek en fazla teklif */
  maxQuotesPerRequest: 5,
  /** Bakiye yükleme alt ve üst sınırı (kuruş) */
  minTopUp: 5000,
  maxTopUp: 10000000,
  /** Havale ile yükleme için platform banka bilgileri */
  bankName: "Banka adı (admin panelinden girin)",
  bankIban: "TR00 0000 0000 0000 0000 0000 00",
  bankAccountHolder: "Şirket unvanı",
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const result: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (!(row.key in DEFAULT_SETTINGS)) continue;
    const def = DEFAULT_SETTINGS[row.key as SettingKey];
    result[row.key] = typeof def === "number" ? Number(row.value) : row.value;
  }
  return result as Settings;
}

export async function updateSettings(values: Partial<Settings>) {
  await prisma.$transaction(
    Object.entries(values).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      }),
    ),
  );
}

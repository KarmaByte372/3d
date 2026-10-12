import { prisma } from "./db";

/**
 * Varsayılan komisyon %20 (2000 bps). Armut'un kamuya açık bir komisyon tarifesi yok;
 * bu oran, hizmet verenlerin bildirdiği kesintilerden yapılan tahmindir (bkz. docs/komisyon.md).
 * Admin panelinden değiştirilebilir.
 */
export const DEFAULT_SETTINGS = {
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
  commissionBps: 2000,
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

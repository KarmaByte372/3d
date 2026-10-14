import { prisma } from "./db";

/**
 * Sunucu açılışında bir kez çalışan veri güncellemeleri. Her biri "migr." önekli bir Setting ile işaretlenir,
 * böylece admin sonradan ayarı değiştirse bile tekrar uygulanmaz.
 */
const MIGRATIONS: { id: string; run: () => Promise<void> }[] = [
  {
    // Gelir modeli teklif ücretine geçti: daha önce kaydedilmiş %20 komisyon %0'a çekilir.
    id: "2026-10-commission-zero",
    run: async () => {
      await prisma.setting.updateMany({ where: { key: "commissionBps" }, data: { value: "0" } });
    },
  },
];

export async function runDataMigrations() {
  for (const m of MIGRATIONS) {
    const key = `migr.${m.id}`;
    if (await prisma.setting.findUnique({ where: { key } })) continue;
    await m.run();
    await prisma.setting.create({ data: { key, value: new Date().toISOString() } });
    console.log(`Veri güncellemesi uygulandı: ${m.id}`);
  }
}
